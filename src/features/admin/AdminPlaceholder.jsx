import '../../layouts/Admin.css';

export default function AdminPlaceholder({ title }) {
  return (
    <section>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-subtitle">
        This module is not built yet.
      </p>
    </section>
  );
}