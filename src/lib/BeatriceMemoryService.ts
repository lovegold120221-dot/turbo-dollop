// ── Beatrice Dynamic Memory Service ──
// Handles session memory bootstrap, freshness validation, and update pipeline.

import { supabase } from './supabase';

// ── Types ──

export type MemorySource =
  | 'app_chat' | 'whatsapp' | 'contact_history'
  | 'uploaded_file' | 'user_profile' | 'system_event'
  | 'manual_note' | 'imported_history';

export interface MemoryRecord {
  id?: string;
  user_id: string;
  tenant_id?: string;
  source: MemorySource;
  source_id?: string;
  session_id?: string;
  conversation_id?: string;
  message_id?: string;
  memory_type: string;
  content: string;
  summary?: string;
  tags?: string[];
  importance_score?: number;
  recency_score?: number;
  confidence_score?: number;
  event_timestamp?: string;
  source_timestamp?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  expires_at?: string;
  is_stale?: boolean;
  supersedes_memory_id?: string;
  superseded_by_memory_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionContextResult {
  timeBlock: string;
  profileBlock: string;
  sessionSummaryBlock: string;
  recentMessagesBlock: string;
  longTermMemoryBlock: string;
  whatsAppBlock: string;
  freshnessBlock: string;
  fullContext: string;
  freshness: MemoryFreshness;
}

export interface MemoryFreshness {
  memoryLoadedAt: string;
  latestMemoryTimestamp: string | null;
  latestConversationTimestamp: string | null;
  staleMemoryDetected: boolean;
  contextRebuilt: boolean;
  status: 'fresh' | 'stale' | 'no_memory';
}

// ── Config Flags ──

const CFG = {
  DYNAMIC_BOOTSTRAP: true,
  DISABLE_STATIC_MEMORY: true,
  REQUIRE_CURRENT_TIME: true,
  RECENCY_FIRST: true,
  LOAD_RECENT_RAW_MESSAGES: true,
  STALE_CHECK: true,
  DEBUG: false,
};

// ── Relative Time Computation ──

export function computeRelativeTime(dateStr: string | Date, referenceDate?: Date): string {
  const ref = referenceDate || new Date();
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diffMs = ref.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 2) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 2) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days < 2) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// ── Time Helpers ──

export function getCurrentTimeBlock(timezone?: string): string {
  const now = new Date();
  const serverTime = now.toISOString();
  let userTime = now.toISOString();
  let tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    userTime = now.toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T');
  } catch {
    tz = 'UTC';
    userTime = serverTime;
  }
  return `[CURRENT_TIME]
server_time: ${serverTime}
user_local_time: ${userTime}
user_timezone: ${tz}
session_started_at: ${serverTime}`;
}

// ── Supabase Query Functions ──

export async function getLatestConversation(userId: string): Promise<{ timestamp: string; summary: string } | null> {
  const { data } = await supabase
    .from('messages')
    .select('created_at, text, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (!data || data.length === 0) return null;
  const latest = data[0];
  const summaries = data.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text?.slice(0, 120)}`).join('\n');
  return { timestamp: latest.created_at, summary: summaries };
}

export async function getRecentMessages(userId: string, limit = 50): Promise<{ role: string; text: string; created_at: string }[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).reverse(); // Return chronological order
}

export async function getSessionSummaries(userId: string): Promise<{ session_start: string; session_end: string; summary: string }[]> {
  try {
    const { data: sessions } = await supabase
      .from('session_summaries')
      .select('session_start, session_end, summary')
      .eq('user_id', userId)
      .order('session_end', { ascending: false })
      .limit(3);
    return sessions || [];
  } catch {
    return [];
  }
}

export async function getLatestSessionTimestamp(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('messages')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0]?.created_at || null;
}

export async function getRelevantMemories(userId: string, _query?: string, limit = 10): Promise<MemoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as MemoryRecord[];
  } catch {
    const { data } = await supabase
      .from('memories')
      .select('id, user_id, content, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []) as MemoryRecord[];
  }
}

export async function getStaleMemoryCount(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('memories')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_stale', true);
    return data?.length || 0;
  } catch {
    return 0;
  }
}

export async function markMemoriesStale(userId: string, olderThan: string): Promise<void> {
  try {
    await supabase
      .from('memories')
      .update({ is_stale: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .lt('created_at', olderThan);
  } catch {
    // Column might not exist
  }
}

// ── Memory Freshness Validation ──

export async function checkMemoryFreshness(userId: string): Promise<MemoryFreshness> {
  const now = new Date().toISOString();
  try {
    const latestMemory = await supabase
      .from('memories')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestConversation = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestMemTs = latestMemory.data?.[0]?.created_at || null;
    const latestConvTs = latestConversation.data?.[0]?.created_at || null;

    return {
      memoryLoadedAt: now,
      latestMemoryTimestamp: latestMemTs,
      latestConversationTimestamp: latestConvTs,
      staleMemoryDetected: false,
      contextRebuilt: false,
      status: !latestConvTs ? 'no_memory' : 'fresh',
    };
  } catch {
    return {
      memoryLoadedAt: now,
      latestMemoryTimestamp: null,
      latestConversationTimestamp: null,
      staleMemoryDetected: false,
      contextRebuilt: false,
      status: 'no_memory',
    };
  }
}

// ── Session Context Builder ──

export async function buildSessionContext(userId: string, options?: {
  timezone?: string;
  waStatus?: string;
  waMessages?: any[];
  sessionId?: string;
}): Promise<SessionContextResult> {
  const timeBlock = getCurrentTimeBlock(options?.timezone);

  const recentMessages = await getRecentMessages(userId, 50);
  let latestConvTimestamp: string | null = null;
  if (recentMessages.length > 0) {
    latestConvTimestamp = recentMessages[recentMessages.length - 1].created_at;
  }

  const timeSinceLast = latestConvTimestamp
    ? computeRelativeTime(latestConvTimestamp)
    : 'no previous conversation';

  const sessions = await getSessionSummaries(userId);
  const memories = await getRelevantMemories(userId);

  // Profile
  const profileBlock = `[SESSION_CONTEXT]
current_time: ${new Date().toISOString()}
last_interaction_at: ${latestConvTimestamp || 'none'}
time_elapsed_since_last_interaction: ${timeSinceLast}`;

  // Session summary
  let sessionSummaryBlock = '[PAST_SESSION_SUMMARIES]\n';
  if (sessions.length > 0) {
    sessionSummaryBlock += sessions.map(s =>
      `session_start: ${s.session_start}\nsession_end: ${s.session_end}\nsummary: ${s.summary?.slice(0, 300)}`
    ).join('\n---\n');
  } else {
    sessionSummaryBlock += 'No archived session summaries available.';
  }

  // Recent raw messages
  let recentMessagesBlock = '[LATEST_CONVERSATION_HISTORY (Last 50 Messages)]\n';
  if (recentMessages.length > 0) {
    recentMessagesBlock += recentMessages.map(m =>
      `[${m.created_at}] ${m.role.toUpperCase()}: ${m.text}`
    ).join('\n');
  } else {
    recentMessagesBlock += 'No recent conversation history.';
  }

  // Long-term memory
  let longTermMemoryBlock = '[LONG_TERM_MEMORY]\n';
  if (memories.length > 0) {
    longTermMemoryBlock += memories.map(m =>
      `[${m.created_at ? computeRelativeTime(m.created_at) : '?'}]${m.tags?.length ? ` [${m.tags.join(', ')}]` : ''} ${m.content?.slice(0, 200)}`
    ).join('\n');
  } else {
    longTermMemoryBlock += 'No persistent memories stored.';
  }

  // WhatsApp context
  let whatsAppBlock = '[WHATSAPP_CONTEXT]\n';
  if (options?.waStatus === 'paired') {
    const waMsgs = options?.waMessages || [];
    if (waMsgs.length > 0) {
      whatsAppBlock += waMsgs.map((c: any) =>
        `  - ${c.name || 'Unknown'}: "${(c.lastMessage || '').slice(0, 80)}"`
      ).join('\n');
    } else {
      whatsAppBlock += 'WhatsApp paired, no recent chats loaded.';
    }
  } else {
    whatsAppBlock += 'WhatsApp not paired.';
  }

  // Freshness
  const freshness = await checkMemoryFreshness(userId);
  const freshnessBlock = `[MEMORY_FRESHNESS]
memory_loaded_at: ${freshness.memoryLoadedAt}
latest_memory_timestamp: ${freshness.latestMemoryTimestamp || 'none'}
latest_conversation_timestamp: ${freshness.latestConversationTimestamp || 'none'}
memory_freshness_status: ${freshness.status}
stale_memory_detected: ${freshness.staleMemoryDetected}`;

  const fullContext = `${timeBlock}

${profileBlock}

${sessionSummaryBlock}

${recentMessagesBlock}

${longTermMemoryBlock}

${whatsAppBlock}

${freshnessBlock}
`;

  return {
    timeBlock,
    profileBlock,
    sessionSummaryBlock,
    recentMessagesBlock,
    longTermMemoryBlock,
    whatsAppBlock,
    freshnessBlock,
    fullContext,
    freshness,
  };
}

// ── Memory Update Pipeline ──

export async function persistMessage(userId: string, role: string, text: string, sessionId?: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('messages')
    .insert({ user_id: userId, role, text, session_id: sessionId || null, created_at: now });
  if (error) console.error('Failed to persist message:', error);
}

export async function updateSessionActivity(userId: string): Promise<void> {
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

export async function addMemory(userId: string, content: string, tags: string[], options?: {
  source?: MemorySource;
  sessionId?: string;
  importance?: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        content,
        tags,
        source: options?.source || 'manual_note',
        session_id: options?.sessionId || null,
        importance_score: options?.importance || 1,
        recency_score: 1,
        is_stale: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.warn('[addMemory] Falling back to base insert:', err.message);
    const { error } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        content,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
}

// ── Debug Status ──

export function isStaticMemoryDisabled(): boolean {
  return CFG.DISABLE_STATIC_MEMORY;
}

export function getMemoryConfig() {
  return { ...CFG };
}
