/**
 * Status Badge Component
 * Maps invoice/payment/vendor status to colored badges
 */

const STATUS_CONFIG = {
  // Invoice statuses
  draft:              { label: 'Draft',              class: 'badge-gray' },
  pending:            { label: 'Pending',            class: 'badge-amber' },
  ocr_complete:       { label: 'OCR Complete',       class: 'badge-blue' },
  validated:          { label: 'Validated',          class: 'badge-blue' },
  po_matched:         { label: 'PO Matched',         class: 'badge-cyan' },
  ap_approved:        { label: 'AP Approved',        class: 'badge-purple' },
  manager_approved:   { label: 'Mgr Approved',       class: 'badge-purple' },
  finance_approved:   { label: 'Finance Approved',   class: 'badge-green' },
  payment_initiated:  { label: 'Payment Initiated',  class: 'badge-blue' },
  paid:               { label: 'Paid',               class: 'badge-green' },
  rejected:           { label: 'Rejected',           class: 'badge-red' },
  on_hold:            { label: 'On Hold',            class: 'badge-amber' },
  duplicate:          { label: 'Duplicate',          class: 'badge-red' },
  // Payment statuses
  initiated:          { label: 'Initiated',          class: 'badge-blue' },
  processing:         { label: 'Processing',         class: 'badge-cyan' },
  failed:             { label: 'Failed',             class: 'badge-red' },
  cancelled:          { label: 'Cancelled',          class: 'badge-gray' },
  // Vendor statuses
  active:             { label: 'Active',             class: 'badge-green' },
  inactive:           { label: 'Inactive',           class: 'badge-gray' },
  blacklisted:        { label: 'Blacklisted',        class: 'badge-red' },
  // Approval actions
  approved:           { label: 'Approved',           class: 'badge-green' },
  sent_back:          { label: 'Sent Back',          class: 'badge-amber' },
  escalated:          { label: 'Escalated',          class: 'badge-red' },
  // Match statuses
  not_matched:        { label: 'Not Matched',        class: 'badge-gray' },
  two_way:            { label: '2-Way Match',        class: 'badge-green' },
  three_way:          { label: '3-Way Match',        class: 'badge-green' },
  partial:            { label: 'Partial',            class: 'badge-amber' },
  mismatch:           { label: 'Mismatch',           class: 'badge-red' },
};

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || { label: status || 'Unknown', class: 'badge-gray' };
  return (
    <span className={`badge ${config.class} ${className}`}>
      {config.label}
    </span>
  );
}
