import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  LocalStorage,
  Clipboard,
  showToast,
  Toast,
  Icon
} from "@raycast/api"
import { useEffect, useState } from "react"
import { SessionManager } from "../session-bridge/session-manager"
import type { SessionState, ProviderId } from "../session-bridge/types"

const LAST_SESSION_KEY = "lastSessionId"

export default function InvokeModelCommand() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeState, setActiveState] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load last session on mount
    loadLastSession()
  }, [])

  const loadLastSession = async () => {
    try {
      const saved = await LocalStorage.getItem<string>(LAST_SESSION_KEY)
      if (saved && SessionManager.listSessions().includes(saved)) {
        loadSession(saved)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error("Failed to load last session:", err)
      setLoading(false)
    }
  }

  const loadSession = (id: string) => {
    try {
      const mgr = SessionManager.load(id)
      const state = mgr.export()
      setSessionId(id)
      setActiveState(state)
      LocalStorage.setItem(LAST_SESSION_KEY, id)
      setLoading(false)
    } catch (err) {
      console.error("Failed to load session:", err)
      showToast(Toast.Style.Failure, "Failed to load session")
      setLoading(false)
    }
  }

  const startNewSession = () => {
    try {
      const mgr = new SessionManager()
      const state = mgr.export()
      setSessionId(state.sessionId)
      setActiveState(state)
      LocalStorage.setItem(LAST_SESSION_KEY, state.sessionId)
      showToast(Toast.Style.Success, `Started session ${state.sessionId.slice(-8)}`)
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to start session")
    }
  }

  if (loading) {
    return <Detail isLoading={true} markdown="Loading session..." />
  }

  if (!sessionId || !activeState) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Start New Session"
              icon={Icon.Plus}
              onAction={startNewSession}
            />
            <Action
              title="Load Existing Session"
              icon={Icon.Folder}
              onAction={() => {
                // Create a temporary state with sessions list
                const sessions = SessionManager.listSessions()
                setActiveState({
                  sessionId: "temp",
                  createdAt: 0,
                  providerBindings: {},
                  transcript: sessions.map((s, i) => ({
                    turn: i,
                    provider: "codex",
                    role: "user",
                    content: s,
                    timestamp: 0
                  }))
                })
              }}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No Active Session"
          description="Start a new session or load an existing one"
        />
      </List>
    )
  }

  // If we're showing the sessions list
  if (activeState.sessionId === "temp") {
    return (
      <List>
        {activeState.transcript.map(t => (
          <List.Item
            key={t.content}
            title={t.content.slice(-12)}
            subtitle={t.content}
            actions={
              <ActionPanel>
                <Action
                  title="Load Session"
                  icon={Icon.Folder}
                  onAction={() => loadSession(t.content)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    )
  }

  // Main chat form
  return (
    <Form
      navigationTitle={`Session: ${sessionId.slice(-8)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Prompt"
            icon={Icon.Send}
            onSubmit={async values => {
              await handleSend(values.prompt, values.provider as ProviderId)
            }}
          />
          <Action
            title="View Transcript"
            icon={Icon.Document}
            onAction={() => {
              // Just show it via toast for now; full detail view needs navigation
              Clipboard.copy(JSON.stringify(activeState.transcript, null, 2))
              showToast(Toast.Style.Success, "Transcript copied to clipboard")
            }}
          />
          <Action
            title="Export Session"
            icon={Icon.Download}
            onAction={async () => {
              const json = JSON.stringify(activeState, null, 2)
              await Clipboard.copy(json)
              showToast(Toast.Style.Success, "Session JSON copied")
            }}
          />
          <Action
            title="New Session"
            icon={Icon.Plus}
            onAction={startNewSession}
          />
          <Action
            title="Load Session"
            icon={Icon.Folder}
            onAction={() => {
              const sessions = SessionManager.listSessions()
              setActiveState({
                sessionId: "temp",
                createdAt: 0,
                providerBindings: {},
                transcript: sessions.map((s, i) => ({
                  turn: i,
                  provider: "codex",
                  role: "user",
                  content: s,
                  timestamp: 0
                }))
              })
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Your Prompt"
        placeholder="Enter your prompt..."
      />
      <Form.Dropdown
        id="provider"
        title="Provider"
        defaultValue={
          activeState.transcript.length > 0
            ? activeState.transcript[activeState.transcript.length - 1].provider
            : "codex"
        }
      >
        <Form.Dropdown.Item value="codex" title="Codex (local)" />
        <Form.Dropdown.Item value="pplx-mlx" title="Perplexity KG (local)" />
        <Form.Dropdown.Item value="claude" title="Claude (API)" />
      </Form.Dropdown>
      <Form.Description text={`Session: ${sessionId.slice(-8)}`} />
      <Form.Description text={`Turns: ${activeState.transcript.length}`} />
    </Form>
  )

  async function handleSend(prompt: string, provider: ProviderId) {
    if (!prompt.trim()) {
      showToast(Toast.Style.Failure, "Prompt cannot be empty")
      return
    }

    if (!sessionId) {
      showToast(Toast.Style.Failure, "No active session")
      return
    }

    setLoading(true)
    try {
      const mgr = SessionManager.load(sessionId)
      const response = await mgr.send(provider, prompt)
      const newState = mgr.export()
      setActiveState(newState)

      await showToast({
        style: Toast.Style.Success,
        title: `${provider} responded`,
        message: response.slice(0, 80) + (response.length > 80 ? "..." : "")
      })
    } catch (err) {
      console.error("Error sending prompt:", err)
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setLoading(false)
    }
  }
}
