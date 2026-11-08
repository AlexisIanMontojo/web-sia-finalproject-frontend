import { useEffect, useState } from 'react';
import { adminMessagesApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import '../../../layouts/Admin.css';
import '../../../layouts/Messages.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'in_app', label: 'In the app' },
  { value: 'email', label: 'Email' },
];

const EMAIL_TEXT = {
  sent: 'Emailed',
  failed: 'Email failed',
  not_configured: 'Email not set up',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const [awaiting, setAwaiting] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [reply, setReply] = useState('');
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [sending, setSending] = useState(false);

  async function loadList(f = filter) {
    setLoading(true);
    try {
      const { data } = await adminMessagesApi.list(f);
      setList(data.data);
      setUnread(data.unread);
      setAwaiting(data.awaiting_reply);
    } catch (err) {
      showError('Could not load messages', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList(filter);
  }, [filter]);

  function markLocally(id, isRead) {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: isRead } : r)));
    setUnread((n) => Math.max(0, n + (isRead ? -1 : 1)));
    setThread((t) => (t && t.id === id ? { ...t, is_read: isRead } : t));
  }

  async function openThread(row) {
    setSelectedId(row.id);
    setReply('');
    setAlsoEmail(false);
    setThreadLoading(true);
    try {
      const { data } = await adminMessagesApi.thread(row.id);
      setThread(data.data);

      // Opening a conversation marks it read for the hotel.
      if (!data.data.is_read) {
        await adminMessagesApi.setRead(row.id, true);
        markLocally(row.id, true);
      }
    } catch (err) {
      showError('Could not open message', err.response?.data?.message || 'Try again.');
    } finally {
      setThreadLoading(false);
    }
  }

  async function toggleRead() {
    if (!thread) return;
    const next = !thread.is_read;
    try {
      await adminMessagesApi.setRead(thread.id, next);
      markLocally(thread.id, next);
    } catch (err) {
      showError('Could not update', err.response?.data?.message || 'Try again.');
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!thread || !reply.trim()) return;

    setSending(true);
    try {
      const { data } = await adminMessagesApi.reply(thread.id, {
        message: reply.trim(),
        send_email: alsoEmail,
      });
      toast('success', data.message);
      setReply('');
      setAlsoEmail(false);

      const fresh = await adminMessagesApi.thread(thread.id);
      setThread(fresh.data.data);
      loadList(filter);
    } catch (err) {
      showError('Could not send reply', err.response?.data?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Notifications
            {unread > 0 && <span className="tag tag-unread">{unread} unread</span>}
            {awaiting > 0 && <span className="tag tag-warn">{awaiting} awaiting reply</span>}
          </h1>
          <p className="admin-page-subtitle">
            Messages from guests, sent in the app or by email. Reply here, and optionally email the guest.
          </p>
        </div>
      </div>

      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="inbox-layout">
        <div className="inbox-list">
          {loading ? (
            <div className="table-empty">Loading…</div>
          ) : list.length === 0 ? (
            <div className="table-empty">No messages here.</div>
          ) : (
            list.map((row) => (
              <button
                key={row.id}
                className={`inbox-item ${row.is_read ? '' : 'unread'} ${selectedId === row.id ? 'active' : ''}`}
                onClick={() => openThread(row)}
              >
                <span className="inbox-subject">{row.subject}</span>
                <span className="muted">{row.guest_name}</span>
                <span className="inbox-meta">
                  <span className={`tag ${row.channel === 'email' ? 'tag-email' : ''}`}>
                    {row.channel === 'email' ? 'Email' : 'In the app'}
                  </span>
                  {!row.is_read && <span className="tag tag-unread">Unread</span>}
                  {row.reply_count > 0 && (
                    <span className="tag">
                      {row.reply_count} repl{row.reply_count === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                  {row.channel === 'email' && row.email_status !== 'not_sent' && (
                    <span className={`tag ${row.email_status === 'sent' ? 'tag-ok' : 'tag-warn'}`}>
                      {EMAIL_TEXT[row.email_status]}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="thread-card">
          {!selectedId && <div className="table-empty">Select a message to read it.</div>}

          {selectedId && threadLoading && <div className="table-empty">Loading…</div>}

          {thread && !threadLoading && (
            <>
              <div className="thread-head">
                <div>
                  <h3>{thread.subject}</h3>
                  <div className="inbox-meta">
                    <span>{thread.guest_name}</span>
                    <span className="muted">{thread.guest_email}</span>
                    <span className={`tag ${thread.channel === 'email' ? 'tag-email' : ''}`}>
                      {thread.channel === 'email' ? 'Sent by email' : 'Sent in the app'}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={toggleRead}>
                  {thread.is_read ? 'Mark as unread' : 'Mark as read'}
                </button>
              </div>

              <div className="bubble-list">
                {thread.messages.map((m) => (
                  <div
                    className={`bubble ${m.sender === 'hotel' ? 'bubble-hotel' : 'bubble-guest'}`}
                    key={m.id}
                  >
                    {m.body}
                    <span className="bubble-time">
                      {m.sender === 'hotel' ? 'Hotel' : thread.guest_name} · {m.created_at?.slice(0, 16)}
                      {m.sender === 'hotel' && m.email_status === 'sent' && ' · emailed'}
                      {m.sender === 'hotel' && m.email_status === 'failed' && ' · email failed'}
                    </span>
                  </div>
                ))}
              </div>

              <form className="reply-box" onSubmit={sendReply}>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Write your reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                />
                <label className="reply-options">
                  <input
                    type="checkbox"
                    checked={alsoEmail}
                    onChange={(e) => setAlsoEmail(e.target.checked)}
                  />
                  Also email this reply to {thread.guest_email}
                </label>
                <div className="modal-footer">
                  <button className="btn btn-primary" disabled={sending || !reply.trim()}>
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}