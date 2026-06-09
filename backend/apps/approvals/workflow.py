"""
Approval Workflow State Machine
Manages invoice state transitions through the approval chain.
Pending → AP Review → Manager Review → Finance Review → Payment
"""
import logging
from django.utils import timezone
from .models import Approval, AuditLog

logger = logging.getLogger(__name__)

# Workflow stage order
WORKFLOW_STAGES = ['ap_review', 'manager_review', 'finance_review', 'payment']

# Map stage → invoice status after approval
STAGE_TO_INVOICE_STATUS = {
    'ap_review': 'ap_approved',
    'manager_review': 'manager_approved',
    'finance_review': 'finance_approved',
    'payment': 'payment_initiated',
}

# Map stage → role required to approve
STAGE_REQUIRED_ROLES = {
    'ap_review': ['ap_executive', 'admin'],
    'manager_review': ['manager', 'admin'],
    'finance_review': ['finance', 'admin'],
    'payment': ['finance', 'admin'],
}


def get_current_stage(invoice):
    """Get the current pending approval stage for an invoice."""
    pending_approval = Approval.objects.filter(
        invoice=invoice,
        action='pending'
    ).order_by('assigned_at').first()
    return pending_approval


def initiate_workflow(invoice, initiated_by):
    """
    Start the approval workflow for a validated invoice.
    Creates the first pending approval (AP Review).
    """
    # Cancel any existing pending approvals
    Approval.objects.filter(invoice=invoice, action='pending').update(action='sent_back')

    # Create AP Review approval
    approval = Approval.objects.create(
        invoice=invoice,
        stage='ap_review',
        action='pending',
        due_date=timezone.now() + timezone.timedelta(days=2)
    )

    # Update invoice status
    invoice.status = 'pending'
    invoice.save()

    # Audit log
    _log_action(initiated_by, 'approval_action', f'Workflow initiated for Invoice #{invoice.invoice_number}',
                'Invoice', invoice.id)

    return approval


def process_approval_action(approval, action, approver, comments=''):
    """
    Process an approval action (approve/reject/send_back).
    Transitions invoice to next stage or terminal state.
    """
    invoice = approval.invoice

    # Verify role permission
    if approver.role not in STAGE_REQUIRED_ROLES.get(approval.stage, []):
        return False, f'Your role ({approver.role}) is not authorized to approve at this stage ({approval.stage}).'

    # Record action
    approval.action = action
    approval.approver = approver
    approval.comments = comments
    approval.action_at = timezone.now()
    approval.save()

    # Log action
    _log_action(approver, 'approval_action',
                f'Invoice #{invoice.invoice_number} {action} at {approval.stage} stage. Comments: {comments}',
                'Invoice', invoice.id)

    if action == 'approved':
        return _advance_workflow(invoice, approval.stage, approver)
    elif action == 'rejected':
        invoice.status = 'rejected'
        invoice.save()
        return True, 'Invoice rejected.'
    elif action == 'sent_back':
        invoice.status = 'validated'
        invoice.save()
        return True, 'Invoice sent back for correction.'

    return False, 'Unknown action.'


def _advance_workflow(invoice, current_stage, approver):
    """Move invoice to next workflow stage after approval."""
    # Update invoice status for this stage
    invoice.status = STAGE_TO_INVOICE_STATUS.get(current_stage, invoice.status)
    invoice.save()

    # Find next stage
    try:
        current_idx = WORKFLOW_STAGES.index(current_stage)
        next_stage = WORKFLOW_STAGES[current_idx + 1] if current_idx + 1 < len(WORKFLOW_STAGES) else None
    except ValueError:
        next_stage = None

    if next_stage:
        # Create next pending approval (including payment stage)
        Approval.objects.create(
            invoice=invoice,
            stage=next_stage,
            action='pending',
            due_date=timezone.now() + timezone.timedelta(days=2)
        )
        return True, f'Invoice advanced to {next_stage} stage.'
    else:
        # All stages complete — mark as fully approved
        invoice.status = 'payment_initiated'
        invoice.save()
        return True, 'Invoice fully approved. Ready for payment.'


def _log_action(user, action, description, obj_type='', obj_id=None):
    """Create an audit log entry."""
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            description=description,
            object_type=obj_type,
            object_id=obj_id,
        )
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")
