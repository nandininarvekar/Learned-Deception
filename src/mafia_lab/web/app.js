const element = (id) => document.getElementById(id);
const ui = Object.fromEntries(["start","seed","learning","replay","spectator","pause","error","status",
  "seats","phase","result","transcript","count","strategies","matrix","memory","insights"].map(id => [id, element(id)]));
const defaultPlayers = "ABCDEF".split("").map(x => "agent_" + x);
let gameId, socket, generation = 0, isPaused = false, isDone = true, received = [];
let retryTimer;
const name = id => id ? "Player " + id.split("_").at(-1) : "Abstain";
function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function showError(error) {
  ui.error.hidden = !error;
  ui.error.textContent = error || "";
}
async function request(path, options) {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
  return data;
}
async function refreshReplays() {
  const data = await request("/api/games");
  ui.replay.replaceChildren(new Option("Select a game", ""));
  for (const game of data.games) {
    ui.replay.add(new Option(game.game_id.slice(0, 8) + (game.done ? "" : " · live"), game.game_id));
  }
  ui.replay.value = gameId || "";
}
function render() {
  const players = received.find(e => e.type === "game_started")?.players || defaultPlayers;
  const roles = ui.spectator.checked ? received.find(e => e.type === "roles_assigned")?.roles || {} : {};
  const eliminated = new Set(received.filter(e => e.type === "player_eliminated").map(e => e.player_id));
  const phase = received.filter(e => e.type === "phase_changed").at(-1);
  const ended = received.filter(e => ["game_ended","game_failed","game_cancelled"].includes(e.type)).at(-1);
  const label = {day_discussion:"Discussion",day_vote:"Voting",night_action:"Night actions"};
  const latestDiscussion = [...received].reverse().find(e => e.type === "public_message" && e.day === phase?.day);
  const round = latestDiscussion?.discussion_round || phase?.discussion_round;
  ui.phase.textContent = ended ? "Game complete" : phase ? "Day " + phase.day + " · " + label[phase.phase] +
    (phase.phase === "day_discussion" && round ? " " + round + "/3" : "") : "Waiting to start";
  ui.seats.replaceChildren(...players.map(id => {
    const card = node("div", undefined, "seat" + (eliminated.has(id) ? " dead" : ""));
    const role = roles[id];
    card.append(node("div",id.at(-1),"avatar"),node("strong",name(id)),
      node("div",(role ? role + " · " : "") + (eliminated.has(id) ? "Out" : "Alive"),"role " + (role || "")));
    return card;
  }));
  ui.result.hidden = !ended;
  ui.result.textContent = !ended ? "" : ended.type === "game_failed" ? "Simulation failed" :
    ended.type === "game_cancelled" ? "Simulation cancelled" : ended.winner === "mafia" ? "Mafia wins" :
    ended.winner === "villagers" ? "Villagers win" : "Draw";
  const rows = [];
  for (const e of received) {
    if (e.visibility !== "public") continue;
    let title, text;
    if (e.type === "public_message") { title = name(e.actor_id); text = e.message; }
    if (e.type === "phase_changed") { title = "Day " + e.day; text = label[e.phase]; }
    if (e.type === "vote_results") { title = "Vote results"; text = e.votes.map(v => name(v.actor_id) + " → " + name(v.target_id)).join(" · "); }
    if (e.type === "night_resolved" && !e.eliminated_player_id) { title = "Night resolved"; text = "No elimination."; }
    if (e.type === "player_eliminated") { title = "Eliminated"; text = name(e.player_id); }
    if (title) {
      const row = node("article");
      row.append(node("strong", title), node("p", text));
      rows.push(row);
    }
  }
  const follow = ui.transcript.scrollHeight - ui.transcript.scrollTop - ui.transcript.clientHeight < 55;
  ui.transcript.replaceChildren(...(rows.length ? rows : [node("p","Public discussion and game events will appear here.","empty")]));
  if (follow) ui.transcript.scrollTop = ui.transcript.scrollHeight;
  ui.count.textContent = rows.length + " events";
  ui.insights.hidden = !ui.spectator.checked;
  const strategies = new Map(), memory = new Map(), beliefs = new Map();
  for (const e of received) {
    if (!ui.spectator.checked) break;
    if (e.type === "strategy_summary") strategies.set(e.actor_id, e.summary);
    if (e.type === "memory_updated") memory.set(e.actor_id, e);
    if (e.type === "belief_probe") beliefs.set(e.actor_id, e.probabilities);
  }
  ui.strategies.replaceChildren(...(strategies.size ? [...strategies].map(([id,text]) => {
    const details = node("div");
    details.append(node("strong",name(id)),node("p",text));
    return details;
  }) : [node("p","Strategy summaries appear as agents act.","empty")]));
  ui.memory.replaceChildren(...(memory.size ? [...memory].map(([id,e]) => {
    const details = node("details");
    details.append(node("summary",name(id)+" · v"+e.memory_version),node("pre",e.markdown));
    return details;
  }) : [node("p","No updates yet.","empty")]));
  if (!beliefs.size) {
    ui.matrix.replaceChildren(node("p","Belief probes appear after each discussion round.","empty"));
    return;
  }
  const table = node("table"), head = node("tr");
  head.append(node("th","From / To"), ...players.map(id => node("th",id.at(-1))));
  table.append(head);
  for (const id of players) {
    const row = node("tr");
    row.append(node("th",id.at(-1)));
    for (const target of players) {
      const value = beliefs.get(id)?.find(e => e.target_id === target)?.p_mafia;
      const cell = node("td",value === undefined ? "–" : Math.round(value*100)+"%");
      if (value !== undefined) cell.style.background = "rgba(228, 116, 105," + (0.08+0.64*value) + ")";
      row.append(cell);
    }
    table.append(row);
  }
  ui.matrix.replaceChildren(table);
}
function connect(id) {
  clearTimeout(retryTimer);
  const current = ++generation;
  if (socket) socket.close();
  received = [];
  gameId = id;
  ui.pause.disabled = true;
  render();
  if (!id) { ui.status.textContent = "Ready"; return; }
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const show = ui.spectator.checked;
  socket = new WebSocket(scheme + "//" + location.host + "/ws/games/" + id + "?spectator=" + show);
  let completed = false;
  socket.onopen = () => {
    if (current !== generation) return;
    isDone = false;
    ui.status.textContent = isPaused ? "Paused" : "Connected";
    ui.pause.disabled = false;
  };
  socket.onmessage = ({data}) => {
    if (current !== generation) return;
    const event = JSON.parse(data);
    if (event.type === "heartbeat") return;
    if (event.type === "stream_ended") {
      completed = isDone = true;
      ui.pause.disabled = true;
      ui.status.textContent = "Complete";
      refreshReplays().catch(error => showError(error.message));
      return;
    }
    received.push(event);
    render();
  };
  socket.onclose = ({code}) => {
    if (current !== generation || completed) return;
    ui.pause.disabled = true;
    ui.status.textContent = "Disconnected";
    if (code !== 4404 && code !== 1008) retryTimer = setTimeout(() => connect(id), 1500);
  };
}
function setupLive() {
  ui.start.addEventListener("submit",async e => {
    e.preventDefault();
    const button = ui.start.querySelector("button");
    button.disabled = true;
    showError();
    try {
      const data = await request("/api/games",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({seed:Number(ui.seed.value),learning:ui.learning.value})});
      isPaused = false;
      ui.pause.textContent = "Pause";
      connect(data.game_id);
      await refreshReplays();
    } catch (error) { showError(error.message); }
    finally { button.disabled = false; }
  });
  ui.replay.addEventListener("change", () => { isPaused = false; ui.pause.textContent = "Pause"; connect(ui.replay.value); });
  ui.spectator.addEventListener("change", () => connect(gameId));
  ui.pause.addEventListener("click",async () => {
    if (!gameId || isDone) return;
    try {
      await request("/api/games/" + gameId + "/" + (isPaused ? "resume" : "pause"),{method:"POST"});
      isPaused = !isPaused;
      ui.pause.textContent = isPaused ? "Resume" : "Pause";
      ui.status.textContent = isPaused ? "Paused" : "Connected";
    } catch (error) { showError(error.message); }
  });
  render();
  refreshReplays().catch(error => showError(error.message));
}

function setupOffline(events) {
  ui.status.textContent = "Offline replay";
  ui.start.hidden = true;
  ui.replay.closest("label").hidden = true;
  ui.pause.hidden = true;
  const control = node("label", "Replay position");
  const slider = node("input");
  slider.type = "range";
  slider.min = 1;
  slider.max = events.length;
  slider.value = events.length;
  const play = node("button", "Play replay");
  play.type = "button";
  let playback;
  const draw = () => {
    received = events.slice(0, Number(slider.value));
    render();
  };
  slider.addEventListener("input", draw);
  ui.spectator.addEventListener("change", draw);
  play.addEventListener("click", () => {
    if (playback) {
      clearInterval(playback);
      playback = null;
      play.textContent = "Play replay";
      return;
    }
    if (Number(slider.value) === events.length) slider.value = 1;
    play.textContent = "Pause replay";
    draw();
    playback = setInterval(() => {
      slider.value = Number(slider.value) + 1;
      draw();
      if (Number(slider.value) === events.length) {
        clearInterval(playback);
        playback = null;
        play.textContent = "Play replay";
      }
    }, 180);
  });
  control.append(slider);
  document.querySelector(".toolbar").append(control, play);
  draw();
}

if (window.mafiaReplay) setupOffline(window.mafiaReplay);
else setupLive();
