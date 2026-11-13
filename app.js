// Backoffice Nice Pressing — page statique, aucune donnée dans le navigateur
// sans passer par l'Edge Function `backoffice`, qui vérifie la connexion
// Google et la liste des adresses autorisées (voir son en-tête).
// En local (localhost), la page parle à apps/backoffice/dev.ts, sans connexion.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bwozstnubbhasgadnrre.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wG3XFNJbaselvbdKMtDsxQ_U4MWNFwF';
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API = LOCAL ? '/api' : `${SUPABASE_URL}/functions/v1/backoffice`;

const supabase = LOCAL
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });

// ------------------------------------------------------------- libellés
const STATUS = {
  pending: ['À accepter', 'warn'],
  accepted: ['Acceptée · collecte à faire', 'info'],
  driver_assigned: ['Livreur vers la collecte', 'info'],
  picked_up: ['Linge collecté', 'info'],
  dropped_off: ['Déposé à l’atelier', 'ok'],
  processing: ['En traitement', 'ok'],
  ready: ['Prête · livraison à faire', 'info'],
  out_for_delivery: ['En livraison', 'info'],
  delivered: ['Livrée', 'done'],
  cancelled: ['Annulée', 'bad'],
};
const ROLES = { customer: 'Client', owner: 'Atelier', driver: 'Livreur' };
const APPS = { client: 'app Client', partner: 'app Atelier', delivery: 'app Livreur', driver: 'app Livreur' };
const PHOTO_KINDS = {
  customer: 'Photo du client',
  pickup: 'Collecte',
  dropoff: 'Dépôt à l’atelier',
  intake: 'Réception à l’atelier',
  issue: 'Défaut signalé',
  handoff: 'Remise',
  delivery: 'Livraison',
};
const INCIDENTS = { absent: 'Client absent', wrong_address: 'Mauvaise adresse', other: 'Autre incident' };
const PROVIDERS = { google: 'Google', apple: 'Apple', email: 'E-mail' };
const MODE_UNIT = { piece: 'pièce', kg: 'kg', m2: 'm²' };
const CONFIDENCE = { high: ['sûr', 'ok'], medium: ['probable', 'info'], low: ['à vérifier', 'warn'] };
const SLOTS = ['8 h – 10 h', '9 h – 11 h', '11 h – 13 h', '14 h – 16 h', '16 h – 18 h', '18 h – 20 h'];
const PICKUP_SLOTS = ['Au plus vite', ...SLOTS];
const ACTIVE_STATUSES = ['pending', 'accepted', 'driver_assigned', 'picked_up', 'dropped_off', 'processing', 'ready', 'out_for_delivery'];
const ACTION_LABELS = {
  '/invites': 'Invitation ajoutée',
  '/invites/delete': 'Invitation retirée',
  '/ateliers/accepts': 'Commandes ouvertes / fermées',
  '/ateliers/update': 'Fiche atelier modifiée',
  '/ateliers/code': 'Code de dépôt changé',
  '/catalog/save': 'Article de la grille enregistré',
  '/catalog/delete': 'Article de la grille supprimé',
  '/areas/add': 'Zone ajoutée',
  '/areas/delete': 'Zone retirée',
  '/orders/update': 'Commande modifiée',
  '/orders/items': 'Articles d’une commande corrigés',
  '/orders/delete': 'Commande(s) supprimée(s)',
  '/people/update': 'Compte modifié',
  '/people/ban': 'Compte bloqué / débloqué',
  '/people/delete': 'Compte supprimé',
  '/settings/update': 'Réglages modifiés',
};

// ------------------------------------------------------------- outils
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

const TZ = 'Europe/Paris';
const money = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0));
const dateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    : '—';
const day = (ymd) =>
  ymd ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${ymd}T12:00:00Z`)) : '—';
const clock = () => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date());
function ago(iso) {
  if (!iso) return '—';
  const minutes = (Date.now() - Date.parse(iso)) / 60000;
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  return `il y a ${Math.round(minutes / 1440)} j`;
}
const fullName = (p) => (p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Sans nom' : '—');
const items = (list) => (list ?? []).map((i) => `${i.quantity} × ${i.name}`).join(', ') || 'Aucun article';
const statusPill = (status) => {
  const [label, tone] = STATUS[status] ?? [status, ''];
  return h('span', { class: `pill ${tone}` }, label);
};
const safeUrl = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : null);
const decimal = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(n ?? 0));
const quantity = (n, mode) => (!mode || mode === 'piece' ? decimal(n) : `${decimal(n)} ${MODE_UNIT[mode]}`);
const unitPrice = (price, mode) => `${money(price)} / ${MODE_UNIT[mode] ?? 'pièce'}`;
function totalRows(t) {
  const row = (label, value, strong) =>
    h('tr', {}, h('td', { colspan: 3 }, strong ? h('b', {}, label) : label), h('td', { class: 'r nowrap' }, strong ? h('b', {}, money(value)) : money(value)));
  return [
    row('Sous-total atelier', t.subtotal),
    row(t.deliveryLabel ? `Livraison (${t.deliveryLabel})` : 'Livraison', t.deliveryFee),
    Number(t.serviceFee) ? row('Frais de service', t.serviceFee) : null,
    Number(t.smallOrderFee) ? row('Petite commande', t.smallOrderFee) : null,
    row('Total', t.total, true),
  ];
}

const app = document.getElementById('app');
const mount = (...nodes) => app.replaceChildren(...nodes);

function toast(message, bad = false) {
  const el = h('div', { class: `toast${bad ? ' bad' : ''}`, role: 'status' }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

/** Lance une action : bouton désactivé pendant l'appel ; erreur en toast ; `done` sinon. */
async function act(button, call, done) {
  if (button) button.disabled = true;
  try {
    const result = await call();
    done?.(result);
    return result;
  } catch (error) {
    toast(error.message, true);
    if (button) button.disabled = false;
    return undefined;
  }
}

/** Confirmation forte pour l'irréversible : il faut retaper `expected`. */
function confirmTyped(message, expected) {
  const answer = prompt(`${message}\n\nC’est définitif. Tapez « ${expected} » pour confirmer.`);
  if (answer == null) return false;
  if (answer.trim().toLowerCase() !== String(expected).toLowerCase()) {
    toast('Confirmation incorrecte : rien n’a été supprimé.', true);
    return false;
  }
  return true;
}

function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), control, hint ? h('small', { class: 'muted' }, hint) : null);
}
function checkField(label, control) {
  return h('label', { class: 'check' }, control, h('span', {}, label));
}
/** Liste déroulante ; une valeur absente des options y est ajoutée telle quelle. */
function selectEl(options, value, props = {}) {
  const list = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  if (value != null && value !== '' && !list.some(([v]) => String(v) === String(value))) list.push([value, value]);
  return h('select', props, list.map(([v, label]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, label)));
}
const numberInput = (value, props = {}) =>
  h('input', { type: 'number', step: '0.01', min: '0', class: 'num', value: value == null || value === '' ? '' : String(Number(value)), ...props });
const textInput = (value, props = {}) => h('input', { type: 'text', value: value ?? '', ...props });

// ------------------------------------------------------------- API
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(path, body) {
  const headers = { 'content-type': 'application/json' };
  if (!LOCAL) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError(401, 'Connexion requise.');
    headers.authorization = `Bearer ${data.session.access_token}`;
    headers.apikey = SUPABASE_KEY;
  }
  let response;
  try {
    response = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Réseau injoignable.');
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, json.error || json.message || json.msg || `Erreur ${response.status}`);
  return json;
}

// ------------------------------------------------------------- écrans
let refreshTimer = null;
let screenSeq = 0;

/** Charge puis dessine ; `refresh` (ms) relance en arrière-plan quand l'onglet est visible. */
async function screen(load, draw, refresh) {
  const seq = ++screenSeq;
  const run = async (first) => {
    if (first) mount(h('p', { class: 'muted center' }, 'Chargement…'));
    try {
      const data = await load();
      if (seq === screenSeq) mount(draw(data, () => run(false)));
    } catch (error) {
      if (seq === screenSeq) failed(error, () => run(true));
    }
  };
  await run(true);
  if (refresh && seq === screenSeq) {
    refreshTimer = setInterval(() => {
      if (!document.hidden) run(false);
    }, refresh);
  }
}

function failed(error, retry) {
  if (error.status === 401 && !LOCAL) {
    supabase.auth.signOut().finally(() => showLogin('Session expirée, reconnectez-vous.'));
    return;
  }
  if (error.status === 403) return showDenied(error.message);
  mount(
    h('div', { class: 'card' }, h('h2', {}, 'Impossible de charger'), h('p', { class: 'error' }, error.message), h('button', { class: 'btn', onclick: retry }, 'Réessayer')),
  );
}

function bar(title, ...extra) {
  return h('div', { class: 'bar' }, h('h1', {}, title), ...extra);
}
function refreshButton(onClick) {
  return h('button', { class: 'btn', type: 'button', onclick: onClick }, 'Rafraîchir');
}

function orderLink(o) {
  return h(
    'a',
    { class: 'row', href: `#/commandes/${o.id}` },
    h('span', { class: 'num' }, `N° ${o.number}`),
    h('span', {}, fullName(o.customer), h('span', { class: 'sub' }, items(o.items))),
    h('span', { class: 'hide-sm' }, `Collecte ${day(o.pickup_date)}`, h('span', { class: 'sub' }, o.pickup_slot)),
    h('span', { class: 'hide-sm' }, `Livraison ${day(o.delivery_date)}`, h('span', { class: 'sub' }, o.delivery_slot)),
    h('span', { class: 'end' }, statusPill(o.status), h('span', { class: 'sub' }, money(o.total))),
  );
}

/** `selection` (facultatif) : un Set d'identifiants, et une case à cocher par ligne. */
function orderList(orders, emptyText, selection, onToggle) {
  if (!orders.length) return h('p', { class: 'empty' }, emptyText);
  return h(
    'ul',
    { class: 'rows' },
    orders.map((o) =>
      h(
        'li',
        {},
        selection
          ? h(
              'div',
              { class: 'selrow' },
              h('input', {
                type: 'checkbox',
                checked: selection.has(o.id),
                'aria-label': `Sélectionner la commande N° ${o.number}`,
                onchange: (event) => {
                  if (event.target.checked) selection.add(o.id);
                  else selection.delete(o.id);
                  onToggle?.();
                },
              }),
              orderLink(o),
            )
          : orderLink(o),
      ),
    ),
  );
}

/** Supprime des commandes pour de bon, après confirmation tapée. */
async function deleteOrdersFlow(button, list, done) {
  const n = list.length;
  if (!n) return;
  const numbers = list.map((o) => `N° ${o.number}`).join(', ');
  const message =
    n === 1
      ? `Supprimer définitivement la commande ${numbers} ? Articles, photos, chronologie, discussions, avis et appels partent avec elle. Le client, l’atelier et le livreur ne la verront plus.`
      : `Supprimer définitivement ${n} commandes (${numbers}) ? Articles, photos, chronologie, discussions, avis et appels partent avec elles.`;
  if (!confirmTyped(message, n === 1 ? String(list[0].number) : 'SUPPRIMER')) return;
  await act(button, () => api('/orders/delete', { ids: list.map((o) => o.id) }), (result) => {
    const failed = result.failed?.length ? ` · ${result.failed.length} en échec : ${result.failed[0].error}` : '';
    toast(`${result.deleted.length} commande${result.deleted.length > 1 ? 's' : ''} supprimée${result.deleted.length > 1 ? 's' : ''}${failed}`, Boolean(failed));
    done();
  });
}

// ------------------------------------------------------- vue d'ensemble
function alertsFor(data) {
  const today = data.today;
  const alerts = [];
  for (const o of data.active) {
    const link = `#/commandes/${o.id}`;
    if (o.status === 'pending') {
      const extra = [o.reminders_sent ? `${o.reminders_sent} relance${o.reminders_sent > 1 ? 's' : ''} envoyée${o.reminders_sent > 1 ? 's' : ''}` : null, o.alerted_at ? 'alerte envoyée' : null].filter(Boolean);
      alerts.push({ tone: o.alerted_at ? 'bad' : '', link, text: `N° ${o.number} attend l’accord de l’atelier depuis ${ago(o.created_at).replace('il y a ', '')}`, sub: [fullName(o.customer), ...extra].join(' · ') });
    }
    if (o.question_pending_since) {
      alerts.push({ tone: 'info', link, text: `N° ${o.number} : question de l’atelier sans réponse`, sub: `Posée ${ago(o.question_pending_since)} · ${fullName(o.customer)}` });
    }
    if (o.pickup_date < today && ['pending', 'accepted', 'driver_assigned'].includes(o.status)) {
      alerts.push({ tone: 'bad', link, text: `N° ${o.number} : collecte en retard`, sub: `Prévue ${day(o.pickup_date)}, ${o.pickup_slot}` });
    } else if (o.delivery_date < today) {
      alerts.push({ tone: 'bad', link, text: `N° ${o.number} : livraison en retard`, sub: `Prévue ${day(o.delivery_date)}, ${o.delivery_slot}` });
    }
  }
  for (const i of data.incidents) {
    alerts.push({
      tone: 'bad',
      link: i.order ? `#/commandes/${i.order.id}` : null,
      text: `${INCIDENTS[i.kind] ?? i.kind}${i.order ? ` · N° ${i.order.number}` : ''}`,
      sub: [fullName(i.driver), ago(i.created_at), i.note].filter(Boolean).join(' · '),
    });
  }
  return alerts;
}

function overviewView() {
  return screen(
    () => api('/overview'),
    (data, reload) => {
      const c = data.counts;
      const alerts = alertsFor(data);
      return h(
        'div',
        {},
        bar('Vue d’ensemble', h('span', { class: 'stamp' }, `Mis à jour à ${clock()} · toutes les 30 s`), refreshButton(reload)),
        h(
          'div',
          { class: 'kpis' },
          h('div', { class: 'kpi azur' }, h('b', {}, c.active), h('span', {}, 'commandes en cours')),
          h('div', { class: 'kpi' }, h('b', {}, c.pickupsToday), h('span', {}, 'collectes aujourd’hui')),
          h('div', { class: 'kpi' }, h('b', {}, c.deliveriesToday), h('span', {}, 'livraisons aujourd’hui')),
          h('div', { class: 'kpi mint' }, h('b', {}, c.delivered), h('span', {}, 'commandes livrées')),
          h('div', { class: 'kpi mint' }, h('b', {}, money(c.revenue)), h('span', {}, 'encaissé (livrées)')),
          h('div', { class: `kpi${c.cancelled ? ' jaune' : ''}` }, h('b', {}, c.cancelled), h('span', {}, 'annulées')),
        ),
        h(
          'div',
          { class: 'grid two' },
          h(
            'div',
            { class: 'card flush' },
            h('h2', {}, `À surveiller${alerts.length ? ` (${alerts.length})` : ''}`),
            alerts.length
              ? h(
                  'div',
                  {},
                  alerts.map((a) =>
                    h(
                      a.link ? 'a' : 'div',
                      { class: 'alert', href: a.link },
                      h('span', { class: `dot ${a.tone}` }),
                      h('span', {}, a.text, h('span', { class: 'sub muted' }, h('br'), a.sub)),
                    ),
                  ),
                )
              : h('p', { class: 'empty' }, 'Rien à signaler : aucune commande en attente, en retard ou bloquée.'),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Activité récente'),
            data.events.length
              ? h(
                  'ul',
                  { class: 'feed' },
                  data.events.slice(0, 14).map((e) =>
                    h(
                      'li',
                      {},
                      h('time', { datetime: e.created_at }, dateTime(e.created_at)),
                      h('span', {}, e.order ? h('a', { href: `#/commandes/${e.order.id}` }, `N° ${e.order.number}`) : '—', ' ', statusPill(e.status), ' ', h('span', { class: 'muted' }, fullName(e.order?.customer))),
                    ),
                  ),
                )
              : h('p', { class: 'muted' }, 'Aucun événement.'),
          ),
        ),
        h('div', { class: 'section card flush' }, h('h2', {}, `Commandes en cours (${data.active.length})`), orderList(data.active, 'Aucune commande en cours.')),
        h(
          'div',
          { class: 'section grid three' },
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Comptes'),
            h('dl', { class: 'kv' }, Object.entries(ROLES).flatMap(([role, label]) => [h('dt', {}, `${label}s`), h('dd', {}, data.people[role] ?? 0)])),
            h('h3', { class: 'section' }, 'Nouveaux sur 7 jours'),
            data.signups.length
              ? h('ul', { class: 'feed' }, data.signups.map((p) => h('li', {}, h('time', {}, dateTime(p.created_at)), h('span', {}, fullName(p), ' ', h('span', { class: 'pill' }, ROLES[p.role] ?? p.role)))))
              : h('p', { class: 'muted' }, 'Aucune inscription.'),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Notifications'),
            h('p', { class: 'muted' }, 'Appareils inscrits aux notifications (apps iOS 2.x).'),
            Object.keys(data.devices).length
              ? h('dl', { class: 'kv' }, Object.entries(data.devices).flatMap(([appName, n]) => [h('dt', {}, APPS[appName] ?? appName), h('dd', {}, n)]))
              : h('p', { class: 'muted' }, 'Aucun appareil.'),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Derniers avis'),
            data.reviews.length
              ? h(
                  'ul',
                  { class: 'feed' },
                  data.reviews.map((r) =>
                    h('li', {}, h('time', {}, dateTime(r.created_at)), h('span', {}, `Livreur ${r.driver_rating ?? '—'}/5 · Soin ${r.care_rating ?? '—'}/5`, r.comment ? h('span', { class: 'sub muted' }, h('br'), `« ${r.comment} »`) : null)),
                  ),
                )
              : h('p', { class: 'muted' }, 'Aucun avis.'),
          ),
        ),
      );
    },
    30000,
  );
}

// --------------------------------------------------------------- commandes
let ordersFilter = 'active';
let ordersSearch = '';
let ordersSelecting = false;
const ordersSelected = new Set();

function ordersView() {
  return screen(
    () => api(`/orders?filter=${ordersFilter}`),
    (data, reload) => {
      const listBox = h('div', {});
      const count = h('span', { class: 'stamp' });
      for (const id of [...ordersSelected]) if (!data.orders.some((o) => o.id === id)) ordersSelected.delete(id);
      let shown = data.orders;

      const deleteButton = h('button', { class: 'btn danger', type: 'button' });
      const allButton = h('button', { class: 'btn', type: 'button' });
      const selectBar = h(
        'div',
        { class: 'bar selectbar', hidden: !ordersSelecting },
        h('span', { class: 'stamp' }, 'Cochez les commandes à supprimer.'),
        allButton,
        deleteButton,
      );
      const refreshSelection = () => {
        deleteButton.textContent = `Supprimer (${ordersSelected.size})`;
        deleteButton.disabled = ordersSelected.size === 0;
        const allChecked = shown.length > 0 && shown.every((o) => ordersSelected.has(o.id));
        allButton.textContent = allChecked ? 'Tout décocher' : 'Tout cocher';
      };
      allButton.addEventListener('click', () => {
        const allChecked = shown.every((o) => ordersSelected.has(o.id));
        for (const o of shown) allChecked ? ordersSelected.delete(o.id) : ordersSelected.add(o.id);
        draw();
      });
      deleteButton.addEventListener('click', (event) =>
        deleteOrdersFlow(event.currentTarget, data.orders.filter((o) => ordersSelected.has(o.id)), () => {
          ordersSelected.clear();
          reload();
        }),
      );
      const selectToggle = h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: () => {
            ordersSelecting = !ordersSelecting;
            if (!ordersSelecting) ordersSelected.clear();
            selectToggle.textContent = ordersSelecting ? 'Terminer' : 'Sélectionner';
            selectBar.hidden = !ordersSelecting;
            draw();
          },
        },
        ordersSelecting ? 'Terminer' : 'Sélectionner',
      );

      const draw = () => {
        const q = ordersSearch.trim().toLowerCase();
        shown = q
          ? data.orders.filter((o) => [String(o.number), fullName(o.customer), o.customer?.email, o.pressing?.name, fullName(o.driver)].join(' ').toLowerCase().includes(q))
          : data.orders;
        count.textContent = `${shown.length} commande${shown.length > 1 ? 's' : ''}`;
        listBox.replaceChildren(
          orderList(shown, q ? 'Aucune commande ne correspond.' : 'Aucune commande.', ordersSelecting ? ordersSelected : null, refreshSelection),
        );
        refreshSelection();
      };
      const seg = h(
        'div',
        { class: 'seg', role: 'group', 'aria-label': 'Filtre' },
        [
          ['active', 'En cours'],
          ['done', 'Terminées'],
          ['all', 'Toutes'],
        ].map(([value, label]) =>
          h('button', { type: 'button', 'aria-pressed': String(ordersFilter === value), onclick: () => { ordersFilter = value; ordersView(); } }, label),
        ),
      );
      const search = h('input', {
        type: 'search',
        placeholder: 'N°, client, atelier, livreur',
        'aria-label': 'Rechercher une commande',
        value: ordersSearch,
        oninput: (event) => {
          ordersSearch = event.target.value;
          draw();
        },
      });
      draw();
      return h(
        'div',
        {},
        bar('Commandes', count, selectToggle, refreshButton(reload)),
        h('div', { class: 'bar' }, seg, search),
        selectBar,
        h('div', { class: 'card flush' }, listBox),
      );
    },
  );
}

// ------------------------------------------------- piloter une commande
/** Statut, livreur, créneaux, frais et actions rapides, comme n'importe quel rôle de l'app. */
function pilotCard(o, reload) {
  const notify = h('input', { type: 'checkbox', checked: true });
  const send = (button, patch, message) =>
    act(button, () => api('/orders/update', { id: o.id, patch, notify: notify.checked }), () => {
      toast(message);
      reload();
    });

  // Statut et livreur
  const status = selectEl(Object.entries(STATUS).map(([value, [label]]) => [value, label]), o.status, { 'aria-label': 'Statut' });
  const driverOptions = [['', '— Aucun livreur —'], ...o.drivers.map((d) => [d.id, fullName(d)])];
  if (o.driver_id && !o.drivers.some((d) => d.id === o.driver_id)) driverOptions.push([o.driver_id, `${fullName(o.driver)} (n’est plus livreur)`]);
  const driver = selectEl(driverOptions, o.driver_id ?? '', { 'aria-label': 'Livreur' });
  const statusForm = h(
    'div',
    { class: 'pilot-block' },
    h('h3', {}, 'Statut et livreur'),
    field('Statut', status),
    field('Livreur', driver),
    h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: (event) => {
          const patch = {};
          if (status.value !== o.status) patch.status = status.value;
          if ((driver.value || null) !== (o.driver_id ?? null)) patch.driver_id = driver.value || null;
          if (!Object.keys(patch).length) return toast('Rien n’a changé.');
          send(event.currentTarget, patch, 'Commande mise à jour.');
        },
      },
      'Appliquer',
    ),
  );

  // Créneaux
  const pickupDate = h('input', { type: 'date', value: o.pickup_date, 'aria-label': 'Date de collecte' });
  const pickupSlot = selectEl(PICKUP_SLOTS, o.pickup_slot, { 'aria-label': 'Créneau de collecte' });
  const deliveryDate = h('input', { type: 'date', value: o.delivery_date, 'aria-label': 'Date de livraison' });
  const deliverySlot = selectEl(SLOTS, o.delivery_slot, { 'aria-label': 'Créneau de livraison' });
  const slotsForm = h(
    'div',
    { class: 'pilot-block' },
    h('h3', {}, 'Créneaux'),
    field('Collecte', h('div', { class: 'pair' }, pickupDate, pickupSlot)),
    field(
      'Livraison',
      h('div', { class: 'pair' }, deliveryDate, deliverySlot),
      o.delivery_proposed_by && !o.delivery_agreed_at
        ? `En discussion : proposée par ${o.delivery_proposed_by === 'customer' ? 'le client' : 'l’atelier'}, sans réponse. L’enregistrer ici vaut accord.`
        : 'Une date fixée ici vaut accord des deux côtés.',
    ),
    h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: (event) => {
          const patch = {};
          if (pickupDate.value !== o.pickup_date) patch.pickup_date = pickupDate.value;
          if (pickupSlot.value !== o.pickup_slot) patch.pickup_slot = pickupSlot.value;
          if (deliveryDate.value !== o.delivery_date) patch.delivery_date = deliveryDate.value;
          if (deliverySlot.value !== o.delivery_slot) patch.delivery_slot = deliverySlot.value;
          const pendingTalk = o.delivery_proposed_by && !o.delivery_agreed_at;
          if (!Object.keys(patch).length && !pendingTalk) return toast('Rien n’a changé.');
          if ('delivery_date' in patch || 'delivery_slot' in patch || pendingTalk) {
            patch.delivery_proposed_by = null;
            patch.delivery_agreed_at = null;
          }
          send(event.currentTarget, patch, 'Créneaux enregistrés.');
        },
      },
      'Enregistrer les créneaux',
    ),
  );

  // Frais
  const deliveryFee = numberInput(o.delivery_fee, { 'aria-label': 'Livraison' });
  const serviceFee = numberInput(o.service_fee, { 'aria-label': 'Frais de service' });
  const smallFee = numberInput(o.small_order_fee, { 'aria-label': 'Petite commande' });
  const feesForm = h(
    'div',
    { class: 'pilot-block' },
    h('h3', {}, 'Frais'),
    field('Livraison (€)', deliveryFee),
    field('Frais de service (€)', serviceFee),
    field('Petite commande (€)', smallFee, `Total = sous-total ${money(o.subtotal)} + frais.`),
    h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: (event) => {
          const patch = {};
          for (const [key, el] of [['delivery_fee', deliveryFee], ['service_fee', serviceFee], ['small_order_fee', smallFee]]) {
            const value = Number(el.value || 0);
            if (Math.abs(value - Number(o[key] ?? 0)) > 0.001) patch[key] = value;
          }
          if (!Object.keys(patch).length) return toast('Rien n’a changé.');
          send(event.currentTarget, patch, 'Frais enregistrés, total recalculé.');
        },
      },
      'Enregistrer les frais',
    ),
  );

  // Actions rapides
  const quick = [];
  if (!['cancelled', 'delivered'].includes(o.status)) {
    quick.push(
      h('button', {
        class: 'btn danger',
        type: 'button',
        onclick: (event) => {
          if (!confirm(`Annuler la commande N° ${o.number} ?${notify.checked ? ' Le client et l’atelier en seront prévenus.' : ''}`)) return;
          send(event.currentTarget, { status: 'cancelled' }, 'Commande annulée.');
        },
      }, 'Annuler la commande'),
    );
  }
  if (o.needs_customer_approval && !o.adjustment_approved_at) {
    quick.push(
      h('button', {
        class: 'btn',
        type: 'button',
        onclick: (event) => {
          if (!confirm(`Valider le nouveau total (${money(o.total)}) à la place du client ?`)) return;
          send(event.currentTarget, { needs_customer_approval: false, adjustment_approved_at: new Date().toISOString() }, 'Nouveau total validé.');
        },
      }, 'Valider le nouveau total à la place du client'),
    );
  }
  if (o.question_pending_since) {
    quick.push(
      h('button', {
        class: 'btn',
        type: 'button',
        onclick: (event) => send(event.currentTarget, { question_pending_since: null }, 'Question close.'),
      }, 'Clore la question de l’atelier'),
    );
  }
  quick.push(
    h('button', {
      class: 'btn danger',
      type: 'button',
      onclick: (event) =>
        deleteOrdersFlow(event.currentTarget, [o], () => {
          location.hash = '#/commandes';
        }),
    }, 'Supprimer définitivement'),
  );

  return h(
    'div',
    { class: 'card pilot section-bottom' },
    h('div', { class: 'bar' }, h('h2', {}, 'Piloter la commande'), checkField('Prévenir les apps (notifications)', notify)),
    h('div', { class: 'pilot-grid' }, statusForm, slotsForm, feesForm),
    h('div', { class: 'bar quick' }, quick),
    h(
      'p',
      { class: 'stamp' },
      'Toutes les transitions sont permises, comme si vous étiez l’atelier, le livreur ou le client. Les statuts « livreur vers la collecte », « linge collecté » et « en livraison » demandent un livreur. Chaque action est notée dans le journal (Réglages).',
    ),
  );
}

/** Carte Articles : lecture, ou correction des lignes (quantité, prix, ajout, retrait). */
function itemsCard(o, reload, readOnly) {
  const box = h('div', {});
  const editButton = h('button', { class: 'btn', type: 'button' }, 'Modifier');
  const show = () => {
    editButton.hidden = false;
    box.replaceChildren(...readOnly().filter(Boolean));
  };
  editButton.addEventListener('click', () => {
    editButton.hidden = true;
    box.replaceChildren(itemsEditor(o, reload, show));
  });
  show();
  return h('div', { class: 'card' }, h('div', { class: 'bar' }, h('h2', {}, 'Articles'), editButton), box);
}

function itemsEditor(o, reload, cancel) {
  const lines = (o.items ?? []).map((i) => ({ id: i.id, name: i.name, pricing_mode: i.pricing_mode, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }));
  const body = h('tbody', {});
  const subtotal = h('b', {});
  const sum = () => {
    subtotal.textContent = money(lines.reduce((total, l) => total + Number(l.quantity || 0) * Number(l.unit_price || 0), 0));
  };
  const draw = () => {
    body.replaceChildren(
      ...lines.map((l, index) => {
        const lineTotal = h('td', { class: 'r nowrap' }, money(l.quantity * l.unit_price));
        const update = (key) => (event) => {
          l[key] = event.target.value;
          lineTotal.textContent = money(Number(l.quantity || 0) * Number(l.unit_price || 0));
          sum();
        };
        return h(
          'tr',
          {},
          h('td', {}, l.name, l.id ? null : [' ', h('span', { class: 'pill info' }, 'ajouté')]),
          h('td', { class: 'r' }, numberInput(l.quantity, { step: l.pricing_mode === 'piece' ? '1' : '0.01', min: l.pricing_mode === 'piece' ? '1' : '0.01', 'aria-label': `Quantité ${l.name}`, oninput: update('quantity') }), h('span', { class: 'sub muted' }, MODE_UNIT[l.pricing_mode])),
          h('td', { class: 'r' }, numberInput(l.unit_price, { 'aria-label': `Prix ${l.name}`, oninput: update('unit_price') })),
          lineTotal,
          h('td', {}, h('button', { class: 'link', type: 'button', onclick: () => { lines.splice(index, 1); draw(); } }, 'Retirer')),
        );
      }),
    );
    sum();
  };

  const groups = {};
  for (const item of o.catalog ?? []) (groups[item.category] ??= []).push(item);
  const pickItem = h(
    'select',
    { 'aria-label': 'Article à ajouter' },
    h('option', { value: '' }, 'Ajouter un article de la grille…'),
    Object.entries(groups).map(([category, list]) =>
      h('optgroup', { label: category }, list.map((item) => h('option', { value: item.id }, `${item.name} · ${unitPrice(item.unit_price, item.pricing_mode)}${item.is_active ? '' : ' (retiré)'}`))),
    ),
  );
  pickItem.addEventListener('change', () => {
    const item = (o.catalog ?? []).find((c) => c.id === pickItem.value);
    pickItem.value = '';
    if (!item) return;
    lines.push({ service_id: item.id, name: item.name, pricing_mode: item.pricing_mode, quantity: 1, unit_price: Number(item.unit_price) });
    draw();
  });

  const recompute = h('input', { type: 'checkbox', checked: true });
  const save = h(
    'button',
    {
      class: 'btn primary',
      type: 'button',
      onclick: (event) => {
        if (!lines.length) return toast('Une commande garde au moins un article : pour tout retirer, supprimez la commande.', true);
        act(
          event.currentTarget,
          () =>
            api('/orders/items', {
              id: o.id,
              recompute_fees: recompute.checked,
              lines: lines.map((l) => ({ ...(l.id ? { id: l.id } : { service_id: l.service_id }), quantity: Number(l.quantity), unit_price: Number(l.unit_price) })),
            }),
          (result) => {
            toast(`Articles enregistrés · total ${money(result.order.total)}`);
            reload();
          },
        );
      },
    },
    'Enregistrer les articles',
  );
  draw();
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'scroll' },
      h(
        'table',
        { class: 'plain edit' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Article'), h('th', { class: 'r' }, 'Qté'), h('th', { class: 'r' }, 'Prix unitaire (€)'), h('th', { class: 'r' }, 'Total'), h('th', {}, ''))),
        body,
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 3 }, 'Sous-total atelier'), h('td', { class: 'r nowrap' }, subtotal), h('td', {}))),
      ),
    ),
    h('div', { class: 'stack' }, pickItem, checkField('Recalculer livraison, frais de service et petite commande avec les réglages actuels', recompute)),
    h('div', { class: 'bar' }, save, h('button', { class: 'link', type: 'button', onclick: cancel }, 'Annuler')),
    h('p', { class: 'stamp' }, 'Aucun minimum n’est appliqué ici : la quantité saisie est facturée telle quelle. Le client n’est pas notifié.'),
  );
}

function orderView(id) {
  return screen(
    () => api(`/orders/${encodeURIComponent(id)}`),
    (o, reload) => {
      const a = o.address;
      const customerId = o.customer?.id;
      return h(
        'div',
        {},
        h('a', { class: 'back', href: '#/commandes' }, '← Commandes'),
        bar(`Commande N° ${o.number}`, statusPill(o.status), h('span', { class: 'stamp' }, `créée le ${dateTime(o.created_at)}`), refreshButton(reload)),
        pilotCard(o, reload),
        h(
          'div',
          { class: 'grid three' },
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Client'),
            h(
              'dl',
              { class: 'kv' },
              h('dt', {}, 'Nom'),
              h('dd', {}, fullName(o.customer)),
              h('dt', {}, 'E-mail'),
              h('dd', {}, o.customer?.email ? h('a', { href: `mailto:${o.customer.email}` }, o.customer.email) : '—'),
              h('dt', {}, 'Téléphone'),
              h('dd', {}, o.customer?.phone ? h('a', { href: `tel:${o.customer.phone.replace(/[^\d+]/g, '')}` }, o.customer.phone) : '—'),
              h('dt', {}, 'Adresse'),
              h('dd', {}, a ? [a.street, h('br'), `${a.postal_code} ${a.city}`] : '—'),
              a?.door_code ? [h('dt', {}, 'Digicode'), h('dd', { class: 'mono' }, a.door_code)] : null,
              a?.floor ? [h('dt', {}, 'Étage'), h('dd', {}, a.floor)] : null,
              a?.instructions ? [h('dt', {}, 'Consignes'), h('dd', {}, a.instructions)] : null,
            ),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Atelier et livreur'),
            h(
              'dl',
              { class: 'kv' },
              h('dt', {}, 'Atelier'),
              h('dd', {}, o.pressing?.name ?? '—', o.pressing?.address ? h('span', { class: 'sub muted' }, h('br'), o.pressing.address) : null),
              h('dt', {}, 'Livreur'),
              h('dd', {}, o.driver ? [fullName(o.driver), o.driver.phone ? [h('br'), h('a', { href: `tel:${o.driver.phone.replace(/[^\d+]/g, '')}` }, o.driver.phone)] : null] : h('span', { class: 'muted' }, 'Pas encore attribué')),
              o.location
                ? [
                    h('dt', {}, 'Position'),
                    h('dd', {}, `vue ${ago(o.location.updated_at)} · `, h('a', { href: `https://maps.apple.com/?q=${o.location.latitude},${o.location.longitude}`, target: '_blank', rel: 'noopener' }, 'voir sur le plan')),
                  ]
                : null,
            ),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Créneaux et codes'),
            h(
              'dl',
              { class: 'kv' },
              h('dt', {}, 'Collecte'),
              h('dd', {}, `${day(o.pickup_date)}, ${o.pickup_slot}`),
              h('dt', {}, 'Livraison'),
              h('dd', {}, `${day(o.delivery_date)}, ${o.delivery_slot}`),
              h('dt', {}, 'Code collecte'),
              h('dd', { class: 'mono' }, o.pickup_code ?? '—'),
              h('dt', {}, 'Code livraison'),
              h('dd', { class: 'mono' }, o.delivery_code ?? '—'),
              o.reminders_sent ? [h('dt', {}, 'Relances'), h('dd', {}, `${o.reminders_sent} à l’atelier`)] : null,
              o.alerted_at ? [h('dt', {}, 'Alerte'), h('dd', {}, dateTime(o.alerted_at))] : null,
              o.question_pending_since ? [h('dt', {}, 'Question'), h('dd', {}, `en attente depuis ${dateTime(o.question_pending_since)}`)] : null,
            ),
          ),
        ),
        h(
          'div',
          { class: 'section grid two' },
          itemsCard(o, reload, () => [
            h(
              'div',
              { class: 'scroll' },
              h(
                'table',
                { class: 'plain' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Article'), h('th', { class: 'r' }, 'Qté'), h('th', { class: 'r' }, 'Prix'), h('th', { class: 'r' }, 'Total'))),
                h(
                  'tbody',
                  {},
                  (o.items ?? []).map((i) =>
                    h(
                      'tr',
                      {},
                      h(
                        'td',
                        {},
                        i.name,
                        i.measured_quantity != null && Number(i.measured_quantity) !== Number(i.declared_quantity ?? i.quantity)
                          ? h('span', { class: 'sub muted' }, h('br'), `annoncé ${quantity(i.declared_quantity, i.pricing_mode)}, mesuré ${quantity(i.measured_quantity, i.pricing_mode)}`)
                          : null,
                      ),
                      h('td', { class: 'r nowrap' }, quantity(i.quantity, i.pricing_mode)),
                      h('td', { class: 'r nowrap' }, money(i.unit_price)),
                      h('td', { class: 'r nowrap' }, money(i.line_total)),
                    ),
                  ),
                  totalRows({ subtotal: o.subtotal, deliveryFee: o.delivery_fee, serviceFee: o.service_fee, smallOrderFee: o.small_order_fee, total: o.total }),
                ),
              ),
            ),
            o.needs_customer_approval && !o.adjustment_approved_at
              ? h('p', {}, h('span', { class: 'pill warn' }, 'Ajustement à valider par le client'), ' ', h('span', { class: 'muted' }, `estimé ${money(o.total_estimated)} à la commande`))
              : o.measured_at
                ? h('p', { class: 'muted' }, `Mesuré à l’atelier le ${dateTime(o.measured_at)}${o.total_estimated != null ? ` · estimé ${money(o.total_estimated)} à la commande` : ''}`)
                : null,
          ]),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Chronologie'),
            o.events.length
              ? h('ol', { class: 'timeline' }, o.events.map((e) => h('li', {}, statusPill(e.status), h('time', { datetime: e.created_at }, dateTime(e.created_at)))))
              : h('p', { class: 'muted' }, 'Aucun événement.'),
          ),
        ),
        h(
          'div',
          { class: 'section card' },
          h('h2', {}, `Photos (${o.photos.length})`),
          o.photos.length
            ? h(
                'div',
                { class: 'photos' },
                o.photos.map((p) => {
                  const url = safeUrl(p.url);
                  return h(
                    'figure',
                    {},
                    url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, h('img', { src: url, alt: PHOTO_KINDS[p.kind] ?? p.kind, loading: 'lazy' })) : h('div', { class: 'muted' }, 'Photo indisponible'),
                    h('figcaption', {}, h('b', {}, PHOTO_KINDS[p.kind] ?? p.kind), ` · ${dateTime(p.created_at)}`, p.note ? [h('br'), p.note] : null),
                  );
                }),
              )
            : h('p', { class: 'muted' }, 'Aucune photo.'),
        ),
        h(
          'div',
          { class: 'section grid two' },
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Messages client ↔ atelier'),
            o.messages.length
              ? h(
                  'div',
                  { class: 'chat' },
                  o.messages.map((m) => {
                    const fromCustomer = m.sender_id === customerId;
                    return h('div', { class: `bubble${fromCustomer ? '' : ' me'}` }, m.content, h('small', {}, `${fromCustomer ? 'Client' : 'Atelier'} · ${dateTime(m.created_at)}`));
                  }),
                )
              : h('p', { class: 'muted' }, 'Aucun message.'),
          ),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Incidents et avis'),
            o.incidents?.length
              ? h('ul', { class: 'feed' }, o.incidents.map((i) => h('li', {}, h('time', {}, dateTime(i.created_at)), h('span', {}, h('span', { class: 'pill bad' }, INCIDENTS[i.kind] ?? i.kind), ' ', fullName(i.driver), i.note ? ` · ${i.note}` : ''))))
              : h('p', { class: 'muted' }, 'Aucun incident.'),
            o.review
              ? h(
                  'div',
                  { class: 'section' },
                  h('h3', {}, 'Avis du client'),
                  h('p', {}, `Livreur ${o.review.driver_rating ?? '—'}/5 · Soin du linge ${o.review.care_rating ?? '—'}/5${Number(o.review.tip_amount) ? ` · pourboire ${money(o.review.tip_amount)}` : ''}`),
                  o.review.tags?.length ? h('div', { class: 'tags' }, o.review.tags.map((t) => h('span', { class: 'pill' }, t))) : null,
                  o.review.comment ? h('p', {}, `« ${o.review.comment} »`) : null,
                )
              : h('p', { class: 'muted' }, 'Pas encore d’avis.'),
          ),
        ),
      );
    },
  );
}

// --------------------------------------------------------------- personnes
let peopleRole = 'all';
let peopleSearch = '';

function inviteStatus(invite) {
  if (!invite.account) return h('span', { class: 'pill' }, 'Pas encore de compte');
  if (invite.account.role === invite.role) return h('span', { class: 'pill ok' }, 'Compte actif');
  return h('span', { class: 'pill warn', title: 'Le compte existait avant l’invitation : son rôle n’a pas changé.' }, `Compte ${ROLES[invite.account.role] ?? invite.account.role}, rôle non appliqué`);
}

function devicesText(p) {
  if (!p.notifications_enabled) return h('span', { class: 'pill warn' }, 'Notifications coupées');
  if (!p.devices.length) return h('span', { class: 'muted' }, p.legacy_push ? 'Ancienne app (Expo)' : 'Aucun appareil');
  return p.devices.map((d) => h('span', { class: 'sub' }, `${APPS[d.app] ?? d.app}${d.environment === 'sandbox' ? ' (test)' : ''} · ${ago(d.last_seen_at)}`));
}

function peopleView() {
  return screen(
    () => api('/people'),
    (data, reload) => {
      // Invitations
      const email = h('input', { type: 'email', name: 'email', placeholder: 'adresse@exemple.fr', required: true, autocomplete: 'off', 'aria-label': 'E-mail à inviter' });
      const role = h('select', { name: 'role', 'aria-label': 'Rôle' }, h('option', { value: 'driver' }, 'Livreur'), h('option', { value: 'owner' }, 'Atelier'));
      const note = h('input', { type: 'text', name: 'note', placeholder: 'Note (facultatif)', 'aria-label': 'Note' });
      const submit = h('button', { class: 'btn primary', type: 'submit' }, 'Inviter');
      const form = h(
        'form',
        {
          class: 'inline',
          onsubmit: async (event) => {
            event.preventDefault();
            submit.disabled = true;
            try {
              await api('/invites', { email: email.value, role: role.value, note: note.value });
              toast(`${email.value.trim()} invité comme ${ROLES[role.value].toLowerCase()}.`);
              reload();
            } catch (error) {
              toast(error.message, true);
              submit.disabled = false;
            }
          },
        },
        email,
        role,
        note,
        submit,
      );

      const invites = data.invites.length
        ? h(
            'ul',
            { class: 'rows' },
            data.invites.map((i) =>
              h(
                'li',
                {},
                h(
                  'div',
                  { class: 'row invite' },
                  h('span', {}, i.email, h('span', { class: 'sub' }, [`ajoutée le ${dateTime(i.created_at)}`, i.note].filter(Boolean).join(' · '))),
                  h('span', { class: 'tags' }, h('span', { class: 'pill' }, ROLES[i.role] ?? i.role), inviteStatus(i)),
                  h(
                    'button',
                    {
                      class: 'btn danger',
                      type: 'button',
                      onclick: async () => {
                        if (!confirm(`Retirer l’invitation de ${i.email} ? Un compte déjà créé garde son rôle.`)) return;
                        try {
                          await api('/invites/delete', { email: i.email });
                          toast('Invitation retirée.');
                          reload();
                        } catch (error) {
                          toast(error.message, true);
                        }
                      },
                    },
                    'Retirer',
                  ),
                ),
              ),
            ),
          )
        : h('p', { class: 'empty' }, 'Aucune invitation.');

      // Comptes
      const listBox = h('ul', { class: 'rows' });
      const count = h('span', { class: 'stamp' });
      const draw = () => {
        const q = peopleSearch.trim().toLowerCase();
        const shown = data.people.filter(
          (p) => (peopleRole === 'all' || p.role === peopleRole) && (!q || [fullName(p), p.email, p.phone].join(' ').toLowerCase().includes(q)),
        );
        count.textContent = `${shown.length} compte${shown.length > 1 ? 's' : ''}`;
        listBox.replaceChildren(
          ...(shown.length
            ? shown.map((p) =>
                h(
                  'li',
                  {},
                  h(
                    'a',
                    { class: 'row person', href: `#/personnes/${p.id}` },
                    h(
                      'span',
                      {},
                      fullName(p),
                      p.deleted_at ? [' ', h('span', { class: 'pill bad' }, 'Supprimé')] : null,
                      p.banned_until ? [' ', h('span', { class: 'pill bad' }, 'Bloqué')] : null,
                      h('span', { class: 'sub' }, p.email),
                      p.phone ? h('span', { class: 'sub' }, p.phone) : null,
                    ),
                    h('span', {}, h('span', { class: 'pill' }, ROLES[p.role] ?? p.role)),
                    h(
                      'span',
                      { class: 'hide-sm' },
                      p.providers.map((x) => PROVIDERS[x] ?? x).join(', ') || '—',
                      h('span', { class: 'sub' }, p.last_sign_in_at ? `connecté ${ago(p.last_sign_in_at)}` : 'jamais connecté'),
                      h('span', { class: 'sub' }, `inscrit le ${dateTime(p.created_at)}`),
                    ),
                    h(
                      'span',
                      { class: 'hide-sm' },
                      p.role === 'customer' ? `${p.orders_as_customer} commande${p.orders_as_customer > 1 ? 's' : ''}` : p.role === 'driver' ? `${p.orders_as_driver} livrée${p.orders_as_driver > 1 ? 's' : ''}` : '',
                      devicesText(p),
                    ),
                  ),
                ),
              )
            : [h('li', { class: 'empty' }, 'Aucun compte ne correspond.')]),
        );
      };
      const seg = h(
        'div',
        { class: 'seg', role: 'group', 'aria-label': 'Rôle' },
        [['all', 'Tous'], ...Object.entries(ROLES)].map(([value, label]) =>
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': String(peopleRole === value),
              onclick: (event) => {
                peopleRole = value;
                for (const b of seg.children) b.setAttribute('aria-pressed', String(b === event.currentTarget));
                draw();
              },
            },
            value === 'all' ? label : `${label}s`,
          ),
        ),
      );
      const search = h('input', { type: 'search', placeholder: 'Nom, e-mail, téléphone', 'aria-label': 'Rechercher un compte', value: peopleSearch, oninput: (event) => { peopleSearch = event.target.value; draw(); } });
      draw();

      return h(
        'div',
        {},
        bar('Personnes', refreshButton(reload)),
        h(
          'div',
          { class: 'card flush' },
          h(
            'div',
            { class: 'pad' },
            h('h2', {}, 'Invitations (ateliers et livreurs)'),
            h('p', { class: 'muted' }, 'Une adresse invitée reçoit son rôle au moment où elle crée son compte (Google, Apple ou e-mail). Un compte qui existe déjà garde son rôle actuel.'),
            form,
          ),
          invites,
        ),
        h('div', { class: 'section bar' }, h('h2', {}, 'Comptes'), count, seg, search),
        h('div', { class: 'card flush' }, listBox),
      );
    },
  );
}

function personView(id) {
  return screen(
    () => api(`/people/${encodeURIComponent(id)}`),
    (p, reload) => {
      const gone = Boolean(p.deleted_at);
      const firstName = textInput(p.first_name, { 'aria-label': 'Prénom', disabled: gone });
      const lastName = textInput(p.last_name, { 'aria-label': 'Nom', disabled: gone });
      const phone = h('input', { type: 'tel', value: p.phone ?? '', 'aria-label': 'Téléphone', disabled: gone });
      const role = selectEl(Object.entries(ROLES), p.role, { 'aria-label': 'Rôle', disabled: gone });
      const notifications = h('input', { type: 'checkbox', checked: p.notifications_enabled, disabled: gone });
      const save = h(
        'button',
        {
          class: 'btn primary',
          type: 'submit',
          disabled: gone,
        },
        'Enregistrer',
      );
      const form = h(
        'form',
        {
          class: 'form-grid',
          onsubmit: (event) => {
            event.preventDefault();
            const patch = {};
            if (firstName.value.trim() !== p.first_name) patch.first_name = firstName.value;
            if (lastName.value.trim() !== p.last_name) patch.last_name = lastName.value;
            if ((phone.value.trim() || null) !== (p.phone ?? null)) patch.phone = phone.value;
            if (role.value !== p.role) patch.role = role.value;
            if (notifications.checked !== p.notifications_enabled) patch.notifications_enabled = notifications.checked;
            if (!Object.keys(patch).length) return toast('Rien n’a changé.');
            if (patch.role && !confirm(`Passer ce compte en « ${ROLES[patch.role]} » ? La personne verra l’app correspondante à sa prochaine ouverture.`)) return;
            act(save, () => api('/people/update', { id: p.id, ...patch }), () => {
              toast('Compte enregistré.');
              reload();
            });
          },
        },
        field('Prénom', firstName),
        field('Nom', lastName),
        field('Téléphone', phone),
        field('Rôle', role, 'Client, Atelier (app NP Pressing) ou Livreur (app NP Livreur).'),
        checkField('Notifications activées', notifications),
        h('div', {}, save),
      );

      const banned = Boolean(p.auth?.banned_until);
      const actions = gone
        ? h('p', { class: 'muted' }, `Compte supprimé le ${dateTime(p.deleted_at)} : profil anonymisé, historique des commandes conservé.`)
        : h(
            'div',
            { class: 'bar' },
            p.auth
              ? h(
                  'button',
                  {
                    class: `btn${banned ? ' primary' : ''}`,
                    type: 'button',
                    onclick: (event) => {
                      const question = banned
                        ? `Débloquer ${fullName(p)} ? Cette personne pourra de nouveau se connecter.`
                        : `Bloquer ${fullName(p)} ? Cette personne ne pourra plus se connecter ni prolonger sa session (effet au plus tard dans l’heure).`;
                      if (!confirm(question)) return;
                      act(event.currentTarget, () => api('/people/ban', { id: p.id, banned: !banned }), () => {
                        toast(banned ? 'Compte débloqué.' : 'Compte bloqué.');
                        reload();
                      });
                    },
                  },
                  banned ? 'Débloquer le compte' : 'Bloquer le compte',
                )
              : null,
            h(
              'button',
              {
                class: 'btn danger',
                type: 'button',
                onclick: (event) => {
                  if (!confirmTyped(`Supprimer le compte ${p.email} ? Comme depuis l’app : connexion supprimée, profil anonymisé, adresses et discussions effacées. Les commandes passées restent (au nom de « Compte supprimé »).`, p.email)) return;
                  act(event.currentTarget, () => api('/people/delete', { id: p.id }), () => {
                    toast('Compte supprimé.');
                    reload();
                  });
                },
              },
              'Supprimer le compte',
            ),
          );

      return h(
        'div',
        {},
        h('a', { class: 'back', href: '#/personnes' }, '← Personnes'),
        bar(
          fullName(p),
          h('span', { class: 'pill' }, ROLES[p.role] ?? p.role),
          gone ? h('span', { class: 'pill bad' }, 'Supprimé') : null,
          banned ? h('span', { class: 'pill bad' }, `Bloqué`) : null,
          refreshButton(reload),
        ),
        h(
          'div',
          { class: 'grid two' },
          h('div', { class: 'card' }, h('h2', {}, 'Profil'), form),
          h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Connexion'),
            h(
              'dl',
              { class: 'kv' },
              h('dt', {}, 'E-mail'),
              h('dd', {}, p.email ? h('a', { href: `mailto:${p.email}` }, p.email) : '—'),
              h('dt', {}, 'Méthode'),
              h('dd', {}, p.auth ? p.auth.providers.map((x) => PROVIDERS[x] ?? x).join(', ') || '—' : 'Aucun compte de connexion'),
              h('dt', {}, 'Dernière'),
              h('dd', {}, p.auth?.last_sign_in_at ? `${dateTime(p.auth.last_sign_in_at)} (${ago(p.auth.last_sign_in_at)})` : 'jamais'),
              h('dt', {}, 'Inscrit'),
              h('dd', {}, dateTime(p.created_at)),
              banned ? [h('dt', {}, 'Bloqué'), h('dd', {}, 'oui, jusqu’à nouvel ordre')] : null,
              h('dt', {}, 'Notifications'),
              h('dd', {}, p.devices.length ? p.devices.map((d) => h('span', { class: 'sub' }, `${APPS[d.app] ?? d.app}${d.environment === 'sandbox' ? ' (test)' : ''} · vu ${ago(d.last_seen_at)}`)) : p.legacy_push ? 'Ancienne app (Expo)' : 'Aucun appareil'),
              p.pressings.length ? [h('dt', {}, 'Atelier'), h('dd', {}, p.pressings.map((x) => x.name).join(', '))] : null,
            ),
            h('div', { class: 'section' }, actions),
          ),
        ),
        h('div', { class: 'section card flush' }, h('h2', {}, `Commandes (${p.orders.length})`), orderList(p.orders, 'Aucune commande, ni comme client, ni comme livreur.')),
        p.addresses.length
          ? h(
              'div',
              { class: 'section card' },
              h('h2', {}, `Adresses (${p.addresses.length})`),
              h(
                'ul',
                { class: 'feed' },
                p.addresses.map((a) =>
                  h(
                    'li',
                    {},
                    h('span', {}, h('b', {}, a.label), a.is_default ? [' ', h('span', { class: 'pill ok' }, 'par défaut')] : null, h('br'), `${a.street}, ${a.postal_code} ${a.city}`, [a.door_code ? `digicode ${a.door_code}` : null, a.floor ? `étage ${a.floor}` : null, a.instructions].filter(Boolean).length ? h('span', { class: 'sub muted' }, h('br'), [a.door_code ? `digicode ${a.door_code}` : null, a.floor ? `étage ${a.floor}` : null, a.instructions].filter(Boolean).join(' · ')) : null),
                  ),
                ),
              ),
            )
          : null,
      );
    },
  );
}

// ----------------------------------------------------------------- ateliers
function ateliersView() {
  return screen(
    () => api('/ateliers'),
    (data, reload) =>
      h(
        'div',
        {},
        bar('Ateliers', refreshButton(reload)),
        h('div', { class: 'grid two' }, data.ateliers.map((p) => atelierCard(p, data, reload))),
        areasCard(data.areas, reload),
      ),
  );
}

function atelierCard(p, data, reload) {
  const code = Array.isArray(p.codes) ? p.codes[0] : p.codes;
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'bar' },
      h('h2', {}, p.name),
      h('span', { class: `pill ${p.is_active ? 'ok' : 'done'}` }, p.is_active ? 'Visible' : 'Masqué'),
      h('span', { class: `pill ${p.accepts_orders ? 'ok' : 'warn'}` }, p.accepts_orders ? 'Prend les commandes' : 'Commandes fermées'),
    ),
    h(
      'dl',
      { class: 'kv' },
      h('dt', {}, 'Adresse'),
      h('dd', {}, p.address),
      h('dt', {}, 'Responsable'),
      h('dd', {}, fullName(p.owner), p.owner?.email ? h('span', { class: 'sub muted' }, h('br'), p.owner.email) : null, p.owner?.phone ? h('span', { class: 'sub muted' }, h('br'), p.owner.phone) : null),
      h('dt', {}, 'Commandes'),
      h('dd', {}, `${p.orders_active} en cours · ${p.orders_total} au total`),
      h('dt', {}, 'Livraison'),
      h('dd', {}, `${money(p.delivery_fee)} · traitement ${p.processing_hours} h`),
      h('dt', {}, 'Note'),
      h('dd', {}, p.rating_count ? `${Number(p.rating).toFixed(1)} / 5 (${p.rating_count} avis)` : 'Pas encore noté'),
      h('dt', {}, 'Code de dépôt'),
      h(
        'dd',
        {},
        h('span', { class: 'mono' }, code?.dropoff_code ?? '—'),
        ' ',
        h(
          'button',
          {
            class: 'link',
            type: 'button',
            onclick: (event) => {
              if (!confirm(`Changer le code de dépôt de ${p.name} ? Les livreurs devront saisir le nouveau code en déposant le linge.`)) return;
              act(event.currentTarget, () => api('/ateliers/code', { id: p.id }), (result) => {
                toast(`Nouveau code : ${result.code}`);
                reload();
              });
            },
          },
          'Changer',
        ),
      ),
    ),
    h(
      'div',
      { class: 'section bar' },
      h(
        'button',
        {
          class: `btn${p.accepts_orders ? ' danger' : ' primary'}`,
          type: 'button',
          onclick: (event) => {
            const next = !p.accepts_orders;
            const question = next
              ? `Rouvrir les commandes chez ${p.name} ? Les clients pourront de nouveau commander.`
              : `Fermer les commandes chez ${p.name} ? Les clients ne pourront plus commander dans cet atelier ; les commandes en cours continuent.`;
            if (!confirm(question)) return;
            act(event.currentTarget, () => api('/ateliers/accepts', { id: p.id, accepts_orders: next }), () => {
              toast(next ? 'Commandes rouvertes.' : 'Commandes fermées.');
              reload();
            });
          },
        },
        p.accepts_orders ? 'Fermer les commandes' : 'Rouvrir les commandes',
      ),
    ),
    h('details', { class: 'section' }, h('summary', {}, 'Modifier la fiche'), atelierForm(p, data.owners, reload)),
    h(
      'h3',
      { class: 'section' },
      `Grille tarifaire (${p.services.length})`,
      p.services.some((s) => s.price_unconfirmed) ? ` · ${p.services.filter((s) => s.price_unconfirmed).length} prix à confirmer` : '',
    ),
    h('details', {}, h('summary', {}, p.services.length ? 'Voir et modifier la grille' : 'Créer la grille'), catalogEditor(p, reload)),
  );
}

function atelierForm(p, owners, reload) {
  const name = textInput(p.name, { required: true });
  const description = h('textarea', { rows: 3, class: 'short' });
  description.value = p.description ?? '';
  const address = textInput(p.address);
  const latitude = numberInput(p.latitude, { step: 'any', min: '-90' });
  const longitude = numberInput(p.longitude, { step: 'any', min: '-180' });
  const deliveryFee = numberInput(p.delivery_fee);
  const processing = numberInput(p.processing_hours, { step: '1' });
  const isActive = h('input', { type: 'checkbox', checked: p.is_active });
  const isPopular = h('input', { type: 'checkbox', checked: p.is_popular });
  const ownerOptions = owners.map((o) => [o.id, `${fullName(o)} · ${o.email}`]);
  const owner = selectEl(ownerOptions, p.owner_id);
  const hours = h('textarea', { rows: 6, class: 'mono short', spellcheck: 'false' });
  hours.value = JSON.stringify(p.opening_hours ?? {}, null, 2);
  const save = h('button', { class: 'btn primary', type: 'submit' }, 'Enregistrer la fiche');
  return h(
    'form',
    {
      class: 'form-grid',
      onsubmit: (event) => {
        event.preventDefault();
        let opening;
        try {
          opening = JSON.parse(hours.value || '{}');
        } catch {
          return toast('Horaires : JSON invalide.', true);
        }
        const next = {
          name: name.value.trim(),
          description: description.value,
          address: address.value.trim(),
          latitude: Number(latitude.value),
          longitude: Number(longitude.value),
          delivery_fee: Number(deliveryFee.value),
          processing_hours: Number(processing.value),
          is_active: isActive.checked,
          is_popular: isPopular.checked,
          owner_id: owner.value,
          opening_hours: opening,
        };
        const before = {
          name: p.name,
          description: p.description ?? '',
          address: p.address,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          delivery_fee: Number(p.delivery_fee),
          processing_hours: Number(p.processing_hours),
          is_active: p.is_active,
          is_popular: p.is_popular,
          owner_id: p.owner_id,
          opening_hours: p.opening_hours ?? {},
        };
        const patch = {};
        for (const [key, value] of Object.entries(next)) {
          if (JSON.stringify(value) !== JSON.stringify(before[key])) patch[key] = value;
        }
        if (!Object.keys(patch).length) return toast('Rien n’a changé.');
        if ('is_active' in patch && !patch.is_active && !confirm(`Masquer ${p.name} ? Les clients ne le verront plus dans l’app.`)) return;
        act(save, () => api('/ateliers/update', { id: p.id, patch }), () => {
          toast('Fiche enregistrée.');
          reload();
        });
      },
    },
    field('Nom', name),
    field('Adresse', address),
    h('div', { class: 'pair' }, field('Latitude', latitude), field('Longitude', longitude)),
    h('div', { class: 'pair' }, field('Livraison (€)', deliveryFee, 'Ancien tarif fixe ; les paliers des Réglages priment.'), field('Traitement (h)', processing)),
    field('Responsable', owner, 'Comptes au rôle Atelier.'),
    field('Description', description),
    field('Horaires (JSON)', hours, 'Par jour : {"open": "08:00", "close": "19:00", "closed": false}.'),
    checkField('Visible dans l’app', isActive),
    checkField('Mis en avant', isPopular),
    h('div', {}, save),
  );
}

const PRICING_MODES = [['piece', 'à la pièce'], ['kg', 'au kilo'], ['m2', 'au m²']];

function catalogEditor(p, reload) {
  const body = h('tbody', {});
  const categories = [...new Set(p.services.map((s) => s.category))].sort();
  const list = h('datalist', { id: `cats-${p.id}` }, categories.map((c) => h('option', { value: c })));
  const sorted = p.services.slice().sort((a, b) => a.category.localeCompare(b.category) || (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));

  const readRow = (s) =>
    h(
      'tr',
      {},
      h(
        'td',
        {},
        s.name,
        s.is_active ? null : [' ', h('span', { class: 'pill done' }, 'retiré')],
        s.price_unconfirmed ? [' ', h('span', { class: 'pill warn' }, 'à confirmer')] : null,
        s.description ? h('span', { class: 'sub muted' }, h('br'), s.description) : null,
      ),
      h('td', { class: 'muted' }, s.category),
      h('td', { class: 'r nowrap' }, unitPrice(s.unit_price, s.pricing_mode), s.pricing_mode !== 'piece' && Number(s.min_quantity) > 1 ? h('span', { class: 'sub muted' }, h('br'), `min. ${quantity(s.min_quantity, s.pricing_mode)}`) : null),
      h('td', { class: 'r' }, h('button', { class: 'link', type: 'button', onclick: (event) => event.currentTarget.closest('tr').replaceWith(editRow(s)) }, 'Modifier')),
    );

  const editRow = (s) => {
    const isNew = !s.id;
    const v = {
      name: textInput(s.name, { 'aria-label': 'Nom', required: true }),
      category: textInput(s.category, { 'aria-label': 'Famille', list: `cats-${p.id}`, required: true }),
      description: textInput(s.description, { 'aria-label': 'Description' }),
      pricing_mode: selectEl(PRICING_MODES, s.pricing_mode ?? 'piece', { 'aria-label': 'Mode de prix' }),
      unit_price: numberInput(s.unit_price, { 'aria-label': 'Prix' }),
      min_quantity: numberInput(s.min_quantity ?? 1, { 'aria-label': 'Minimum facturé', min: '0.01' }),
      bulk_units: numberInput(s.bulk_units ?? 1, { 'aria-label': 'Unités de volume' }),
      sort: numberInput(s.sort ?? 0, { 'aria-label': 'Ordre', step: '1', min: '' }),
      price_unconfirmed: h('input', { type: 'checkbox', checked: Boolean(s.price_unconfirmed) }),
      is_active: h('input', { type: 'checkbox', checked: s.is_active ?? true }),
    };
    const values = () => ({
      name: v.name.value,
      category: v.category.value,
      description: v.description.value,
      pricing_mode: v.pricing_mode.value,
      unit_price: Number(v.unit_price.value),
      min_quantity: Number(v.min_quantity.value),
      bulk_units: Number(v.bulk_units.value),
      sort: Number(v.sort.value),
      price_unconfirmed: v.price_unconfirmed.checked,
      is_active: v.is_active.checked,
    });
    const row = h(
      'tr',
      { class: 'editing' },
      h(
        'td',
        { colspan: 4 },
        h(
          'div',
          { class: 'form-grid compact' },
          field('Nom', v.name),
          field('Famille', v.category),
          field('Description', v.description),
          h('div', { class: 'pair' }, field('Prix (€)', v.unit_price), field('Mode', v.pricing_mode)),
          h('div', { class: 'pair' }, field('Minimum facturé', v.min_quantity), field('Unités de volume', v.bulk_units, 'Pour les paliers de livraison.')),
          field('Ordre dans la famille', v.sort),
          checkField('Prix à confirmer', v.price_unconfirmed),
          checkField('En vente', v.is_active),
        ),
        h(
          'div',
          { class: 'bar' },
          h(
            'button',
            {
              class: 'btn primary',
              type: 'button',
              onclick: (event) => {
                const payload = isNew ? { pressing_id: p.id, ...values() } : { id: s.id, ...values() };
                act(event.currentTarget, () => api('/catalog/save', payload), () => {
                  toast(isNew ? 'Article ajouté.' : 'Article enregistré.');
                  reload();
                });
              },
            },
            isNew ? 'Ajouter' : 'Enregistrer',
          ),
          h('button', { class: 'link', type: 'button', onclick: () => (isNew ? row.remove() : row.replaceWith(readRow(s))) }, 'Annuler'),
          isNew
            ? null
            : h(
                'button',
                {
                  class: 'btn danger push',
                  type: 'button',
                  onclick: (event) => {
                    if (!confirm(`Supprimer « ${s.name} » de la grille ? S’il figure déjà dans des commandes, retirez-le plutôt de la vente.`)) return;
                    act(event.currentTarget, () => api('/catalog/delete', { id: s.id }), () => {
                      toast('Article supprimé.');
                      reload();
                    });
                  },
                },
                'Supprimer',
              ),
        ),
      ),
    );
    return row;
  };

  body.replaceChildren(...sorted.map(readRow));
  return h(
    'div',
    {},
    list,
    h(
      'div',
      { class: 'scroll' },
      h('table', { class: 'plain' }, h('thead', {}, h('tr', {}, h('th', {}, 'Article'), h('th', {}, 'Famille'), h('th', { class: 'r' }, 'Prix'), h('th', {}, ''))), body),
    ),
    h(
      'button',
      {
        class: 'btn section-top',
        type: 'button',
        onclick: () => {
          const row = editRow({ category: categories[0] ?? '', pricing_mode: 'piece', unit_price: 0, is_active: true });
          body.prepend(row);
          row.querySelector('input')?.focus();
        },
      },
      'Ajouter un article',
    ),
  );
}

function areasCard(areas, reload) {
  const postal = textInput('', { placeholder: '06000', inputmode: 'numeric', maxlength: 5, 'aria-label': 'Code postal', class: 'short-input' });
  const city = textInput('', { placeholder: 'Nice', 'aria-label': 'Ville' });
  const add = h('button', { class: 'btn primary', type: 'submit' }, 'Ajouter');
  return h(
    'div',
    { class: 'section card' },
    h('h2', {}, `Zones desservies (${areas.length})`),
    h('p', { class: 'muted' }, 'Un client ne peut commander que si son code postal est dans la liste.'),
    h(
      'div',
      { class: 'tags' },
      areas.map((a) =>
        h(
          'span',
          { class: 'pill info removable' },
          `${a.postal_code} ${a.city}`,
          h(
            'button',
            {
              type: 'button',
              'aria-label': `Retirer ${a.postal_code} ${a.city}`,
              onclick: (event) => {
                if (!confirm(`Ne plus desservir ${a.postal_code} ${a.city} ? Les nouvelles commandes de ce code postal seront refusées.`)) return;
                act(event.currentTarget, () => api('/areas/delete', { postal_code: a.postal_code }), () => {
                  toast('Zone retirée.');
                  reload();
                });
              },
            },
            '×',
          ),
        ),
      ),
    ),
    h(
      'form',
      {
        class: 'inline section-top',
        onsubmit: (event) => {
          event.preventDefault();
          act(add, () => api('/areas/add', { postal_code: postal.value, city: city.value }), () => {
            toast('Zone ajoutée.');
            reload();
          });
        },
      },
      postal,
      city,
      add,
    ),
  );
}

// ----------------------------------------------------------------- réglages
function settingsView() {
  return screen(
    () => api('/settings'),
    (data, reload) =>
      h(
        'div',
        {},
        bar('Réglages', refreshButton(reload)),
        data.settings ? platformCard(data.settings, reload) : h('p', { class: 'error' }, 'Réglages de la plateforme introuvables.'),
        journalCard(data.journal),
      ),
  );
}

function platformCard(s, reload) {
  const pct = (n) => String(Math.round(Number(n) * 10000) / 100);
  const rate = numberInput(pct(s.service_fee_rate), { step: '0.1', max: '100' });
  const min = numberInput(s.service_fee_min);
  const max = numberInput(s.service_fee_max);
  const minOrder = numberInput(s.min_order_subtotal);
  const smallFee = numberInput(s.small_order_fee);
  const threshold = numberInput(pct(s.adjustment_threshold), { step: '1' });

  const tiers = (s.delivery_tiers ?? []).map((t) => ({ max_units: t.max_units ?? '', fee: t.fee, label: t.label ?? '' }));
  const tierBody = h('tbody', {});
  const drawTiers = () =>
    tierBody.replaceChildren(
      ...tiers.map((t, index) =>
        h(
          'tr',
          {},
          h('td', {}, index === tiers.length - 1 ? h('span', { class: 'muted' }, 'au-delà') : numberInput(t.max_units, { step: '1', 'aria-label': 'Jusqu’à (unités)', oninput: (e) => (t.max_units = e.target.value) })),
          h('td', {}, numberInput(t.fee, { 'aria-label': 'Prix (€)', oninput: (e) => (t.fee = e.target.value) })),
          h('td', {}, textInput(t.label, { placeholder: 'automatique', 'aria-label': 'Libellé', oninput: (e) => (t.label = e.target.value) })),
          h('td', {}, tiers.length > 1 ? h('button', { class: 'link', type: 'button', onclick: () => { tiers.splice(index, 1); drawTiers(); } }, 'Retirer') : null),
        ),
      ),
    );
  drawTiers();

  const save = h('button', { class: 'btn primary', type: 'submit' }, 'Enregistrer les réglages');
  return h(
    'form',
    {
      class: 'card',
      onsubmit: (event) => {
        event.preventDefault();
        const deliveryTiers = tiers.map((t, index) => {
          const tier = { fee: Number(t.fee) };
          if (index < tiers.length - 1) tier.max_units = Number(t.max_units);
          if (String(t.label ?? '').trim()) tier.label = String(t.label).trim();
          return tier;
        });
        const patch = {
          service_fee_rate: Number(rate.value) / 100,
          service_fee_min: Number(min.value),
          service_fee_max: Number(max.value),
          min_order_subtotal: Number(minOrder.value),
          small_order_fee: Number(smallFee.value),
          adjustment_threshold: Number(threshold.value) / 100,
          delivery_tiers: deliveryTiers,
        };
        if (!confirm('Enregistrer ces réglages ? Ils s’appliquent tout de suite aux nouveaux paniers et aux recalculs (pesée, corrections).')) return;
        act(save, () => api('/settings/update', patch), () => {
          toast('Réglages enregistrés.');
          reload();
        });
      },
    },
    h('h2', {}, 'Frais de la plateforme'),
    h('p', { class: 'muted' }, `Dernière modification ${dateTime(s.updated_at)}. Mêmes réglages que l’écran « Frais » de l’app atelier.`),
    h(
      'div',
      { class: 'pilot-grid' },
      h(
        'div',
        { class: 'pilot-block' },
        h('h3', {}, 'Frais de service'),
        field('Taux (%)', rate),
        h('div', { class: 'pair' }, field('Plancher (€)', min), field('Plafond (€)', max)),
      ),
      h(
        'div',
        { class: 'pilot-block' },
        h('h3', {}, 'Petite commande'),
        field('Sous-total minimum (€)', minOrder),
        field('Supplément en dessous (€)', smallFee),
        field('Seuil d’ajustement (%)', threshold, 'Au-delà de ce dépassement après pesée, le client doit valider le nouveau total.'),
      ),
      h(
        'div',
        { class: 'pilot-block' },
        h('h3', {}, 'Livraison par paliers de volume'),
        h('div', { class: 'scroll' }, h('table', { class: 'plain edit tiers' }, h('thead', {}, h('tr', {}, h('th', {}, 'Jusqu’à (unités)'), h('th', {}, 'Prix (€)'), h('th', {}, 'Libellé'), h('th', {}, ''))), tierBody)),
        h(
          'button',
          {
            class: 'link',
            type: 'button',
            onclick: () => {
              const last = tiers[tiers.length - 1];
              tiers.splice(tiers.length - 1, 0, { max_units: '', fee: last?.fee ?? 0, label: '' });
              drawTiers();
            },
          },
          'Ajouter un palier',
        ),
      ),
    ),
    h('div', { class: 'bar section-top' }, save),
  );
}

function journalCard(rows) {
  return h(
    'div',
    { class: 'section card flush' },
    h('h2', {}, `Journal du backoffice (${rows.length} dernières actions)`),
    rows.length
      ? h(
          'ul',
          { class: 'rows' },
          rows.map((r) =>
            h(
              'li',
              { class: 'journal' },
              h('time', { datetime: r.created_at }, dateTime(r.created_at)),
              h(
                'div',
                {},
                h('b', {}, ACTION_LABELS[r.action] ?? (r.action.startsWith('/data/') ? `Table ${r.action.split('/')[2]} : ${r.action.endsWith('/delete') ? 'ligne supprimée' : 'ligne enregistrée'}` : r.action)),
                h('span', { class: 'sub muted' }, [r.actor, r.target].filter(Boolean).join(' · ')),
                h('details', {}, h('summary', {}, 'Détail'), h('pre', { class: 'json' }, JSON.stringify(r.detail, null, 2))),
              ),
            ),
          ),
        )
      : h('p', { class: 'empty' }, 'Aucune action pour l’instant.'),
  );
}

// ------------------------------------------------------- données brutes
const cell = (value) => {
  if (value == null) return h('span', { class: 'muted' }, 'null');
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
};

function dataIndexView() {
  return screen(
    () => api('/data'),
    (data, reload) =>
      h(
        'div',
        {},
        bar('Données', refreshButton(reload)),
        h(
          'p',
          { class: 'muted' },
          'Toutes les tables de la base, sans filtre. Pour corriger ce que les écrans ne couvrent pas. Les règles de la base s’appliquent comme dans l’app : changer un statut ici envoie les mêmes notifications. Supprimer une commande ou un compte passe par la suppression complète.',
        ),
        h(
          'div',
          { class: 'card flush' },
          h(
            'ul',
            { class: 'rows' },
            data.tables.map((t) =>
              h(
                'li',
                {},
                h(
                  'a',
                  { class: 'row table-row', href: `#/donnees/${t.name}` },
                  h('span', {}, t.label, h('span', { class: 'sub mono' }, t.name)),
                  h('span', { class: 'end' }, t.error ? h('span', { class: 'pill bad' }, 'erreur') : `${t.count ?? '—'} ligne${t.count > 1 ? 's' : ''}`, t.readonly ? h('span', { class: 'sub' }, 'lecture seule') : null),
                ),
              ),
            ),
          ),
        ),
      ),
  );
}

const dataState = { table: null, rows: [], count: 0, filterCol: '', filterValue: '', search: '' };

function dataTableView(name) {
  if (dataState.table !== name) Object.assign(dataState, { table: name, filterCol: '', filterValue: '', search: '' });
  const query = () => {
    const params = new URLSearchParams({ limit: '100', offset: '0' });
    if (dataState.filterCol) {
      params.set('col', dataState.filterCol);
      params.set('eq', dataState.filterValue);
    }
    return params;
  };
  return screen(
    () => api(`/data/${encodeURIComponent(name)}?${query()}`),
    (data, reload) => {
      const rows = data.rows.slice();
      const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const keyOf = (row) => Object.fromEntries(data.key.map((k) => [k, row[k]]));
      const editorBox = h('div', {});
      const tbody = h('tbody', {});
      const count = h('span', { class: 'stamp' });
      let offset = rows.length;

      const openEditor = (row) => {
        const isNew = !row;
        const text = h('textarea', { class: 'mono json-edit', rows: 16, spellcheck: 'false', 'aria-label': 'Ligne en JSON' });
        const template = isNew
          ? Object.fromEntries(columns.filter((c) => !['created_at', 'updated_at'].includes(c) && !(data.key.includes(c) && c === 'id')).map((c) => [c, null]))
          : row;
        text.value = JSON.stringify(template, null, 2);
        const save = h(
          'button',
          {
            class: 'btn primary',
            type: 'button',
            disabled: data.readonly,
            onclick: (event) => {
              let next;
              try {
                next = JSON.parse(text.value);
              } catch (error) {
                return toast(`JSON invalide : ${error.message}`, true);
              }
              if (!next || typeof next !== 'object' || Array.isArray(next)) return toast('Un objet JSON est attendu.', true);
              let values = next;
              if (!isNew) {
                values = {};
                for (const [k, v] of Object.entries(next)) if (JSON.stringify(v) !== JSON.stringify(row[k])) values[k] = v;
                if (!Object.keys(values).length) return toast('Rien n’a changé.');
              } else {
                values = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== null));
              }
              act(event.currentTarget, () => api(`/data/${name}/save`, isNew ? { values } : { key: keyOf(row), values }), () => {
                toast(isNew ? 'Ligne ajoutée.' : 'Ligne enregistrée.');
                reload();
              });
            },
          },
          isNew ? 'Ajouter la ligne' : 'Enregistrer',
        );
        const remove = isNew || data.readonly
          ? null
          : h(
              'button',
              {
                class: 'btn danger push',
                type: 'button',
                onclick: (event) => {
                  const label = data.key.map((k) => row[k]).join(' / ');
                  const expected = name === 'orders' ? String(row.number) : name === 'profiles' ? row.email : 'SUPPRIMER';
                  if (!confirmTyped(`Supprimer la ligne ${label} de ${name} ?${name === 'orders' ? ' La commande part avec tout ce qui s’y rattache.' : name === 'profiles' ? ' Le compte est supprimé comme depuis l’app (profil anonymisé).' : ''}`, expected)) return;
                  act(event.currentTarget, () => api(`/data/${name}/delete`, { key: keyOf(row) }), () => {
                    toast('Ligne supprimée.');
                    editorBox.replaceChildren();
                    reload();
                  });
                },
              },
              'Supprimer',
            );
        editorBox.replaceChildren(
          h(
            'div',
            { class: 'card section-bottom' },
            h('h2', {}, isNew ? `Nouvelle ligne dans ${name}` : `Ligne ${data.key.map((k) => row[k]).join(' / ')}`),
            isNew ? h('p', { class: 'muted' }, 'Les colonnes laissées à null prennent leur valeur par défaut.') : null,
            text,
            h('div', { class: 'bar section-top' }, save, h('button', { class: 'link', type: 'button', onclick: () => editorBox.replaceChildren() }, 'Fermer'), remove),
          ),
        );
        editorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      const drawRows = () => {
        const q = dataState.search.trim().toLowerCase();
        const shown = q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows;
        count.textContent = `${shown.length} affichée${shown.length > 1 ? 's' : ''} sur ${data.count ?? rows.length}`;
        tbody.replaceChildren(
          ...shown.map((r) => h('tr', { class: 'clickable', tabindex: 0, onclick: () => openEditor(r), onkeydown: (e) => e.key === 'Enter' && openEditor(r) }, columns.map((c) => h('td', { class: 'nowrap' }, cell(r[c]))))),
        );
      };

      const more =
        data.count > rows.length
          ? h(
              'button',
              {
                class: 'btn section-top',
                type: 'button',
                onclick: (event) => {
                  const button = event.currentTarget;
                  const params = query();
                  params.set('offset', String(offset));
                  act(button, () => api(`/data/${encodeURIComponent(name)}?${params}`), (next) => {
                    rows.push(...next.rows);
                    offset = rows.length;
                    button.disabled = false;
                    if (rows.length >= (next.count ?? 0)) button.remove();
                    drawRows();
                  });
                },
              },
              'Charger 100 lignes de plus',
            )
          : null;

      const filterCol = selectEl([['', 'Filtrer une colonne…'], ...columns.map((c) => [c, c])], dataState.filterCol, { 'aria-label': 'Colonne à filtrer' });
      const filterValue = textInput(dataState.filterValue, { placeholder: 'valeur exacte (null pour vide)', 'aria-label': 'Valeur' });
      const filterForm = h(
        'form',
        {
          class: 'inline',
          onsubmit: (event) => {
            event.preventDefault();
            dataState.filterCol = filterCol.value;
            dataState.filterValue = filterValue.value;
            dataTableView(name);
          },
        },
        filterCol,
        filterValue,
        h('button', { class: 'btn', type: 'submit' }, 'Filtrer'),
        dataState.filterCol
          ? h('button', { class: 'link', type: 'button', onclick: () => { dataState.filterCol = ''; dataState.filterValue = ''; dataTableView(name); } }, 'Tout voir')
          : null,
      );
      const search = h('input', { type: 'search', placeholder: 'Chercher dans les lignes chargées', 'aria-label': 'Chercher', value: dataState.search, oninput: (e) => { dataState.search = e.target.value; drawRows(); } });

      drawRows();
      return h(
        'div',
        {},
        h('a', { class: 'back', href: '#/donnees' }, '← Données'),
        bar(data.label, h('span', { class: 'mono stamp' }, name), count, data.readonly ? h('span', { class: 'pill' }, 'lecture seule') : h('button', { class: 'btn', type: 'button', onclick: () => openEditor(null) }, 'Nouvelle ligne'), refreshButton(reload)),
        h('div', { class: 'bar' }, filterForm, search),
        editorBox,
        rows.length
          ? h('div', { class: 'card flush scroll' }, h('table', { class: 'plain data' }, h('thead', {}, h('tr', {}, columns.map((c) => h('th', {}, c)))), tbody))
          : h('p', { class: 'empty card' }, 'Aucune ligne.'),
        more,
      );
    },
  );
}

// ------------------------------------------------------- estimation (IA)
// L'IA reconnaît les articles dans la grille ; les montants viennent de
// quote_order, le même calcul que le panier de l'app.
const MAX_PHOTOS = 4;
const estimateState = { pressingId: '', description: '', photos: [], result: null, error: null, busy: false };

/** Réduit une photo (1568 px au plus, JPEG) : moins lourd à envoyer, assez net pour l'IA. */
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { media_type: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl };
}

function estimateResult(r) {
  return h(
    'div',
    { class: 'card' },
    h('h2', {}, `Estimation${r.quote ? ` : ${money(r.quote.total)}` : ''}`),
    r.summary ? h('p', {}, r.summary) : null,
    r.items.length
      ? h(
          'div',
          { class: 'scroll' },
          h(
            'table',
            { class: 'plain' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Article reconnu'), h('th', { class: 'r' }, 'Qté'), h('th', { class: 'r' }, 'Tarif'), h('th', { class: 'r' }, 'Total'))),
            h(
              'tbody',
              {},
              r.items.map((i) => {
                const q = i.quote;
                const [label, tone] = CONFIDENCE[i.confidence] ?? [i.confidence, ''];
                return h(
                  'tr',
                  {},
                  h(
                    'td',
                    {},
                    h('b', {}, i.name),
                    ' ',
                    h('span', { class: `pill ${tone}` }, label),
                    i.price_unconfirmed ? [' ', h('span', { class: 'pill warn' }, 'prix à confirmer')] : null,
                    h('span', { class: 'sub muted' }, h('br'), i.reason),
                  ),
                  h(
                    'td',
                    { class: 'r nowrap' },
                    q ? quantity(q.quantity, q.pricingMode) : '—',
                    q?.dimensions ? h('span', { class: 'sub muted' }, h('br'), `${q.dimensions.lengthCm} × ${q.dimensions.widthCm} cm`) : null,
                    q && Number(q.quantity) > Number(q.requestedQuantity) ? h('span', { class: 'sub muted' }, h('br'), 'minimum facturé') : null,
                  ),
                  h('td', { class: 'r nowrap' }, unitPrice(i.unit_price, i.pricing_mode)),
                  h('td', { class: 'r nowrap' }, q ? money(q.lineTotal) : '—'),
                );
              }),
              r.quote ? totalRows(r.quote) : null,
            ),
          ),
        )
      : h('p', { class: 'muted' }, 'Aucun article de la grille reconnu.'),
    r.quote?.estimated ? h('p', { class: 'muted' }, 'Montant indicatif : des prix sont à confirmer, ou se fixent à la pesée et à la mesure à l’atelier.') : null,
    r.quoteError ? h('p', { class: 'error' }, `Chiffrage impossible : ${r.quoteError}`) : null,
    r.unmatched.length
      ? [
          h('h3', { class: 'section' }, 'Hors grille'),
          h(
            'ul',
            { class: 'feed' },
            r.unmatched.map((u) =>
              h('li', {}, h('span', {}, h('b', {}, u.object), ` : ${u.reason}`, u.closest ? h('span', { class: 'sub muted' }, h('br'), `Le plus proche : ${u.closest.name}, ${unitPrice(u.closest.unit_price, u.closest.pricing_mode)}`) : null)),
            ),
          ),
        ]
      : null,
    r.questions.length ? [h('h3', { class: 'section' }, 'À demander ou à vérifier'), h('ul', {}, r.questions.map((q) => h('li', {}, q)))] : null,
    r.dropped ? h('p', { class: 'muted' }, `${r.dropped} proposition${r.dropped > 1 ? 's' : ''} de l’IA écartée${r.dropped > 1 ? 's' : ''} (article absent de la grille).`) : null,
    h('p', { class: 'stamp section' }, `${r.pressing.name} · ${r.model} · ${r.usage.input + r.usage.cached} jetons lus dont ${r.usage.cached} en cache, ${r.usage.output} écrits`),
  );
}

function estimateView() {
  return screen(
    () => api('/ateliers'),
    (data) => {
      const ateliers = data.ateliers.filter((a) => a.services.length);
      if (!ateliers.length) return h('div', {}, bar('Estimer un prix'), h('p', { class: 'muted' }, 'Aucun atelier n’a encore de grille tarifaire.'));
      if (!ateliers.some((a) => a.id === estimateState.pressingId)) estimateState.pressingId = ateliers[0].id;

      const resultBox = h('div', {});
      const drawResult = () =>
        resultBox.replaceChildren(
          estimateState.busy
            ? h('div', { class: 'card' }, h('p', { class: 'muted' }, 'L’IA examine les articles… comptez 10 à 40 secondes.'))
            : estimateState.error
              ? h('p', { class: 'error' }, estimateState.error)
              : estimateState.result
                ? estimateResult(estimateState.result)
                : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Le résultat s’affichera ici : les articles reconnus, leur tarif, le total avec livraison et frais, et ce qu’il faudrait vérifier.')),
        );

      const thumbs = h('div', { class: 'thumbs' });
      const drawThumbs = () =>
        thumbs.replaceChildren(
          ...estimateState.photos.map((p, index) =>
            h(
              'figure',
              {},
              h('img', { src: p.preview, alt: `Photo ${index + 1}` }),
              h('button', { type: 'button', class: 'link', onclick: () => { estimateState.photos.splice(index, 1); drawThumbs(); } }, 'Retirer'),
            ),
          ),
        );

      const select = h(
        'select',
        { 'aria-label': 'Atelier', onchange: (event) => { estimateState.pressingId = event.target.value; } },
        ateliers.map((a) => h('option', { value: a.id, selected: a.id === estimateState.pressingId }, `${a.name} (${a.services.length} articles)`)),
      );
      const text = h('textarea', {
        rows: 6,
        maxlength: 2000,
        'aria-label': 'Articles à chiffrer',
        placeholder: 'Ex. : 3 chemises, un costume deux pièces en laine, une robe de soirée longue avec perles, une couette 2 places, un tapis d’environ 2 m × 1,40 m',
        oninput: (event) => { estimateState.description = event.target.value; },
      });
      text.value = estimateState.description;
      const file = h('input', {
        type: 'file',
        accept: 'image/*',
        multiple: true,
        'aria-label': 'Ajouter des photos',
        onchange: async (event) => {
          const files = [...event.target.files];
          event.target.value = '';
          for (const f of files) {
            if (estimateState.photos.length >= MAX_PHOTOS) {
              toast(`${MAX_PHOTOS} photos au plus.`, true);
              break;
            }
            try {
              estimateState.photos.push(await shrinkPhoto(f));
            } catch {
              toast(`Photo illisible : ${f.name}`, true);
            }
          }
          drawThumbs();
        },
      });
      const submit = h('button', { class: 'btn primary', type: 'submit' }, 'Estimer le prix');
      const form = h(
        'form',
        {
          class: 'estimate',
          onsubmit: async (event) => {
            event.preventDefault();
            if (estimateState.busy) return;
            if (!estimateState.description.trim() && !estimateState.photos.length) {
              toast('Décrivez les articles ou ajoutez une photo.', true);
              return;
            }
            estimateState.busy = true;
            estimateState.error = null;
            submit.disabled = true;
            drawResult();
            try {
              estimateState.result = await api('/estimate', {
                pressing_id: estimateState.pressingId,
                description: estimateState.description,
                photos: estimateState.photos.map(({ media_type, data }) => ({ media_type, data })),
              });
            } catch (error) {
              estimateState.result = null;
              estimateState.error = error.message;
            } finally {
              estimateState.busy = false;
              submit.disabled = false;
              drawResult();
              if (window.innerWidth < 760) resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
        },
        h('label', {}, 'Atelier', select),
        h('label', {}, 'Articles', text),
        h('label', { class: 'file' }, 'Photos (facultatif, 4 au plus)', file),
        thumbs,
        h(
          'div',
          { class: 'bar' },
          submit,
          h('button', { type: 'button', class: 'link', onclick: () => { Object.assign(estimateState, { description: '', photos: [], result: null, error: null }); estimateView(); } }, 'Tout effacer'),
        ),
      );
      drawThumbs();
      drawResult();
      return h(
        'div',
        {},
        bar('Estimer un prix'),
        h('p', { class: 'muted' }, 'Décrivez le linge ou prenez-le en photo : l’IA reconnaît les articles dans la grille de l’atelier, puis le total est calculé avec les règles de l’app (minimums, m², kilos, livraison, frais). C’est une aide : le prix final reste celui fixé à l’atelier.'),
        h('div', { class: 'grid two' }, h('div', { class: 'card' }, form), resultBox),
      );
    },
  );
}

// ----------------------------------------------------------- navigation
function router() {
  clearInterval(refreshTimer);
  const [, section = '', id] = location.hash.replace(/^#/, '').split('/');
  const tab = { '': 'overview', commandes: 'orders', prix: 'estimate', personnes: 'people', ateliers: 'ateliers', reglages: 'settings', donnees: 'data' }[section] ?? 'overview';
  for (const link of document.querySelectorAll('#tabs a')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  if (section === 'commandes' && id) return orderView(id);
  if (section === 'commandes') return ordersView();
  if (section === 'personnes' && id) return personView(id);
  if (section === 'personnes') return peopleView();
  if (section === 'reglages') return settingsView();
  if (section === 'donnees' && id) return dataTableView(id);
  if (section === 'donnees') return dataIndexView();
  if (section === 'ateliers') return ateliersView();
  if (section === 'prix') return estimateView();
  return overviewView();
}

function showShell(email) {
  document.getElementById('tabs').hidden = false;
  document.getElementById('who').hidden = false;
  document.getElementById('who-email').textContent = email;
  document.getElementById('logout').hidden = LOCAL;
  window.addEventListener('hashchange', router);
  router();
}

function hideShell() {
  clearInterval(refreshTimer);
  window.removeEventListener('hashchange', router);
  document.getElementById('tabs').hidden = true;
  document.getElementById('who').hidden = true;
}

function signIn() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } },
  });
}

function showLogin(message) {
  hideShell();
  mount(
    h(
      'div',
      { class: 'login' },
      h(
        'div',
        { class: 'card' },
        h('img', { src: 'favicon.svg', alt: '', width: 64, height: 64 }),
        h('h1', {}, 'Backoffice'),
        h('p', { class: 'muted' }, 'Accès réservé à l’équipe Nice Pressing.'),
        message ? h('p', { class: 'error' }, message) : null,
        h('button', { class: 'btn primary gbtn', type: 'button', onclick: signIn }, 'Continuer avec Google'),
      ),
    ),
  );
}

async function showDenied(message) {
  hideShell();
  const { data } = await supabase.auth.getSession();
  mount(
    h(
      'div',
      { class: 'login' },
      h(
        'div',
        { class: 'card' },
        h('h1', {}, 'Accès refusé'),
        h('p', {}, message || 'Ce compte n’a pas accès au backoffice.'),
        data.session?.user?.email ? h('p', { class: 'muted' }, `Connecté avec ${data.session.user.email}.`) : null,
        h(
          'button',
          {
            class: 'btn primary',
            type: 'button',
            onclick: async () => {
              await supabase.auth.signOut();
              signIn();
            },
          },
          'Changer de compte Google',
        ),
      ),
    ),
  );
}

document.getElementById('logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

async function boot() {
  if (LOCAL) return showShell('local · clé secrète');

  const params = new URLSearchParams(location.search);
  const oauthError = params.get('error_description') || params.get('error');
  const { data } = await supabase.auth.getSession(); // échange le ?code= du retour Google
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  if (!data.session) return showLogin(oauthError ? `Connexion Google refusée : ${oauthError}` : null);

  try {
    const me = await api('/me');
    showShell(me.email);
  } catch (error) {
    if (error.status === 403) return showDenied(error.message);
    if (error.status === 401) {
      await supabase.auth.signOut();
      return showLogin('Session expirée, reconnectez-vous.');
    }
    showLogin(error.message);
  }
}

boot();
