/**
 * App Layout - Wraps all authenticated pages with Sidebar + Navbar
 */
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children, title, subtitle }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} subtitle={subtitle} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
