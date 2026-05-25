const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const loading = document.querySelector("#loading");
const sources = document.querySelector("#sources");
const newChatButton = document.querySelector("#new-chat");
const sessionLabel = document.querySelector("#session-label");

const SESSION_KEY = "ragAssistant.sessionId";
const HISTORY_KEY_PREFIX = "ragAssistant.history.";

let sessionId = getOrCreateSessionId();
let chatHistory = loadHistory(sessionId);

sessionLabel.textContent = sessionId;
renderMessages();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  appendMessage("user", message);
  input.value = "";
  resizeInput();
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Request failed.");
    }

    appendMessage("assistant", data.answer, data.fallback ? "fallback" : "assistant");
    renderSources(data.sources || []);
  } catch (error) {
    appendMessage("assistant", error.message, "error");
  } finally {
    setLoading(false);
  }
});

input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

newChatButton.addEventListener("click", () => {
  sessionId = createSessionId();
  localStorage.setItem(SESSION_KEY, sessionId);
  chatHistory = [];
  sessionLabel.textContent = sessionId;
  renderMessages();
  renderSources([]);
  input.focus();
});

function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = createSessionId();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

function createSessionId() {
  return `session-${crypto.randomUUID()}`;
}

function loadHistory(id) {
  try {
    return JSON.parse(localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`) || "[]");
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(`${HISTORY_KEY_PREFIX}${sessionId}`, JSON.stringify(chatHistory.slice(-30)));
}

function appendMessage(role, content, state = role) {
  chatHistory.push({
    role,
    content,
    state,
    createdAt: new Date().toISOString(),
  });
  saveHistory();
  renderMessages();
}

function renderMessages() {
  messages.innerHTML = "";
  if (chatHistory.length === 0) {
    appendEmptyState();
    return;
  }

  for (const item of chatHistory) {
    const message = document.createElement("article");
    message.className = `message ${item.role} ${item.state === "error" ? "error" : ""}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = item.content;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatTime(item.createdAt);

    message.append(bubble, meta);
    messages.append(message);
  }
  messages.scrollTop = messages.scrollHeight;
}

function appendEmptyState() {
  const message = document.createElement("article");
  message.className = "message assistant";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = "Knowledge base ready.";
  message.append(bubble);
  messages.append(message);
}

function renderSources(items) {
  sources.innerHTML = "";
  if (!items.length) {
    sources.className = "sources empty";
    sources.textContent = "No sources returned.";
    return;
  }
  sources.className = "sources";
  for (const source of items) {
    const card = document.createElement("article");
    card.className = "source-card";

    const title = document.createElement("strong");
    title.textContent = source.title;

    const meta = document.createElement("p");
    meta.textContent = `${source.chunk_id} • ${source.similarity.toFixed(3)}`;

    const excerpt = document.createElement("p");
    excerpt.textContent = source.text.slice(0, 210);

    card.append(title, meta, excerpt);
    sources.append(card);
  }
}

function setLoading(isLoading) {
  loading.classList.toggle("hidden", !isLoading);
  form.querySelector("button").disabled = isLoading;
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
