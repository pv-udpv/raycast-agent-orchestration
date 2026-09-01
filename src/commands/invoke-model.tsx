import { Action, ActionPanel, Detail, Toast, showToast, Form } from "@raycast/api"
import { useState } from "react"

interface InvokeResponse {
  ok: boolean
  model: string
  runner: string
  output: string
  latency: number
  tokens: number
  error?: string
}

export default function InvokeModel() {
  const [prompt, setPrompt] = useState("")
  const [kind, setKind] = useState("research")
  const [urgency, setUrgency] = useState("low")
  const [result, setResult] = useState<InvokeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function invoke() {
    if (!prompt.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Prompt required"
      })
      return
    }

    try {
      setIsLoading(true)
      showToast({
        style: Toast.Style.Animated,
        title: "Invoking model...",
        message: `${kind} task with ${urgency} urgency`
      })

      const agentUrl = process.env.AGENT_URL || "http://localhost:8787"
      const resp = await fetch(`${agentUrl}/agents/chat-tree/main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "invokeModel",
          params: {
            kind,
            prompt,
            urgency
          }
        })
      })

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = (await resp.json()) as InvokeResponse
      if (!data.ok) throw new Error(data.error || "Unknown error")

      setResult(data)
      showToast({
        style: Toast.Style.Success,
        title: "Inference complete",
        message: `${data.model} (${data.runner}) in ${data.latency}ms`
      })
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Inference failed",
        message: (err as Error).message
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (result) {
    return (
      <Detail
        markdown={`# Inference Result

**Model:** \`${result.model}\`  
**Runner:** ${result.runner}  
**Latency:** ${result.latency}ms  
**Tokens:** ${result.tokens}  

## Output

${result.output}
`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.output} title="Copy Output" />
            <Action
              title="Back"
              onAction={() => setResult(null)}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Invoke" onAction={invoke} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your prompt..."
        value={prompt}
        onChange={setPrompt}
      />
      <Form.Dropdown
        id="kind"
        title="Task kind"
        value={kind}
        onChange={setKind}
      >
        <Form.Dropdown.Item value="normalize" title="Normalize" />
        <Form.Dropdown.Item value="export" title="Export" />
        <Form.Dropdown.Item value="plan" title="Plan" />
        <Form.Dropdown.Item value="research" title="Research" />
        <Form.Dropdown.Item value="code" title="Code" />
      </Form.Dropdown>
      <Form.Dropdown
        id="urgency"
        title="Urgency"
        value={urgency}
        onChange={setUrgency}
      >
        <Form.Dropdown.Item value="low" title="Low (prefer local)" />
        <Form.Dropdown.Item value="medium" title="Medium (local w/ fallback)" />
        <Form.Dropdown.Item value="high" title="High (prefer remote)" />
      </Form.Dropdown>
    </Form>
  )
}
