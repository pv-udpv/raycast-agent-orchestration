import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api"
import { useState } from "react"
import * as api from "../lib/api"
import { validateTitle, validateFolderName, ValidationError } from "../lib/validation"

export default function NormalizeRoot() {
  const { pop } = useNavigation()
  const [chatId, setChatId] = useState("")
  const [folderId, setFolderId] = useState("")
  const [title, setTitle] = useState("00-root-ollama-launch-harness-research")

  const handleSubmit = async () => {
    try {
      if (!validateTitle(title)) {
        throw new ValidationError("Invalid title format. Expected NN-slug")
      }
      if (folderId && !validateFolderName("00-ollama-launch-harness-research")) {
        throw new ValidationError("Invalid folder name")
      }

      showToast({ style: Toast.Style.Animated, title: "Normalizing root..." })
      await api.normalizeRoot(chatId, folderId, title)
      showToast({ style: Toast.Style.Success, title: "Root normalized" })
      pop()
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to normalize root",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Normalize Root Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="chatId" title="Chat ID" value={chatId} onChange={setChatId} />
      <Form.TextField id="folderId" title="Folder ID" value={folderId} onChange={setFolderId} />
      <Form.TextField id="title" title="Root Title" value={title} onChange={setTitle} />
    </Form>
  )
}
