import { useState } from 'react';
import { messagesApi } from './customerService';
import { toast, showError } from '../../lib/alerts';
import { useCachedFetch } from '../../lib/cache';
import '../../layouts/Customer.css';
import '../../layouts/Messages.css';

const fetchMessages = async () => {
  const { data } = await messagesApi.list();
  return data.data;
};

const fetchUnread = async () => {
  const { data } = await messagesApi.unreadCount();
  return data.unread;
};

const EMPTY = { channel: 'in_app', subject: '', message: '' };

export default function ContactPage() {
  const state = useCachedFetch('customer:messages', fetchMessages);
  const unread = useCachedFetch('customer:unread', fetchUnread);
  const threads = state.data ?? [];
  const unreadCount = unread.data ?? 0;

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState([]);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [marking, setMarking] = useState(false);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function send(e) {
    e.preventDefault();
    setSending(true);
    setErrors([]);
    try {
      const { data } = await messagesApi.send(form);
      toast('success', data.message);
      setForm(EMPTY);
      state.refresh();
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Could not send.']);
    } finally {
      setSending(false);
    }
  }

  async function reply(threadId) {
    const text = (replyText[threadId] || '').trim();
    if (!text) return;

    setReplyingId(threadId);
    try {
      await messagesApi.reply(threadId, text);
      setReplyText((r) => ({ ...r, [threadId]: '' }));
      toast('success', 'Reply sent');
      state.refresh();
    } catch (err) {
      showError('Could not send reply', err.response?.data?.message || 'Try again.');
    } finally {
      setReplyingId(null);
    }
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await messagesApi.markRead();
      unread.setData(0);
      window.dispatchEvent(new Event('messages:changed'));
    } catch (err) {
      showError('Could not update notifications', err.response?.data?.message || 'Try again.');
    } finally {
      setMarking(false);
    }
  }

  function statusOf(thread) {
    const last = thread.replies.length ? thread.replies[thread.replies.length - 1] : thread;
    return last.sender === 'hotel'
      ? { text: 'The hotel replied', cls: 'tag-ok' }
      : { text: 'Waiting for the hotel', cls: 'tag-unread' };
  }

  return (
    <section className="stack">
      <div className="hero">
        <h1>Contact the hotel</h1>
        <p>Send a message in the app or email the hotel. Replies appear in your conversations.</p>
      </div>

      {unreadCount > 0 && (
        <div className="notice-banner" role="status">
          <span className="bell-badge">{unreadCount}</span>
          <span>
            {unreadCount === 1
              ? 'You have 1 new reply from the hotel.'
              : `You have ${unreadCount} new replies from the hotel.`}
          </span>
          <button className="btn-soft" disabled={marking} onClick={markAllRead}>
            {marking ? 'Updating…' : 'Mark all as read'}
          </button>
        </div>
      )}

      <form className="panel stack" onSubmit={send}>
        <h3>New message</h3>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
        )}

        <div className="channel-picker" role="radiogroup" aria-label="How to send">
          <label className={`channel-card ${form.channel === 'in_app' ? 'selected' : ''}`}>
            <input type="radio" name="channel" value="in_app" checked={form.channel === 'in_app'} onChange={onChange} />
            <span>
              <strong>Send in the app</strong>
              <small>The hotel answers in your conversations.</small>
            </span>
          </label>
          <label className={`channel-card ${form.channel === 'email' ? 'selected' : ''}`}>
            <input type="radio" name="channel" value="email" checked={form.channel === 'email'} onChange={onChange} />
            <span>
              <strong>Email the hotel</strong>
              <small>Sent to the hotel's inbox. Replies also appear here.</small>
            </span>
          </label>
        </div>

        <label className="field-label">
          Subject
          <input className="input" name="subject" value={form.subject} onChange={onChange} required />
        </label>

        <label className="field-label">
          Message
          <textarea
            className="input"
            name="message"
            rows={5}
            value={form.message}
            onChange={onChange}
            required
          />
        </label>

        <div>
          <button className="btn-main" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>

      <div className="panel stack">
        <h3>Your conversations</h3>

        {state.loading && !state.data && <p className="muted">Loading…</p>}
        {state.data && threads.length === 0 && (
          <p className="muted">You have not sent any messages yet.</p>
        )}

        {threads.map((t) => {
          const status = statusOf(t);
          return (
            <div className="thread-card" key={t.id}>
              <div className="thread-head">
                <div>
                  <h3>{t.subject}</h3>
                  <div className="inbox-meta">
                    <span className={`tag ${t.channel === 'email' ? 'tag-email' : ''}`}>
                      {t.channel === 'email' ? 'Sent by email' : 'Sent in the app'}
                    </span>
                    <span className={`tag ${status.cls}`}>{status.text}</span>
                  </div>
                </div>
                <span className="muted">{t.created_at?.slice(0, 10)}</span>
              </div>

              <div className="bubble-list">
                <div className="bubble bubble-guest">
                  {t.body}
                  <span className="bubble-time">{t.created_at?.slice(0, 16)}</span>
                </div>
                {t.replies.map((r) => (
                  <div className={`bubble ${r.sender === 'hotel' ? 'bubble-hotel' : 'bubble-guest'}`} key={r.id}>
                    {r.sender === 'hotel' ? 'Hotel: ' : ''}{r.body}
                    <span className="bubble-time">{r.created_at?.slice(0, 16)}</span>
                  </div>
                ))}
              </div>

              <div className="reply-box">
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Write a reply…"
                  value={replyText[t.id] || ''}
                  onChange={(e) => setReplyText((r) => ({ ...r, [t.id]: e.target.value }))}
                />
                <div>
                  <button
                    className="btn-soft"
                    disabled={replyingId === t.id || !(replyText[t.id] || '').trim()}
                    onClick={() => reply(t.id)}
                  >
                    {replyingId === t.id ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}