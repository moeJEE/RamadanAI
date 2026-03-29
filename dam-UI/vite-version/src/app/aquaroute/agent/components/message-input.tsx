"use client"

import { useState } from "react"
import { Send, Mic } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface MessageInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "Posez votre question à AquaRoute AI..."
}: MessageInputProps) {
  const [message, setMessage] = useState("")

  const handleSendMessage = () => {
    const trimmedMessage = message.trim()
    console.log("[MessageInput] trying to send:", trimmedMessage)
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage)
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="border-t p-4 flex gap-2 items-center bg-background">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[44px] max-h-[120px] resize-none flex-1 py-3"
        rows={1}
      />
      {message.trim() ? (
        <Button onClick={handleSendMessage} disabled={disabled} className="h-[44px] w-[44px] p-0 shrink-0">
          <Send className="h-5 w-5" />
        </Button>
      ) : (
        <Button variant="outline" disabled={disabled} className="h-[44px] w-[44px] p-0 shrink-0">
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
