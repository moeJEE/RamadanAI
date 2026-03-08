"use client"

import { useEffect, useRef } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Chat } from "./components/chat"
import { useChat, type Conversation, type Message, type User } from "./use-chat"

const currentUser: User = {
  id: "current-user",
  name: "Utilisateur",
  email: "user@aquaroute.ai",
  avatar: "",
  status: "online",
  lastSeen: new Date().toISOString(),
  role: "Admin",
  department: "Opérations"
}

const aiAgent: User = {
  id: "ai-agent",
  name: "AquaRoute AI",
  email: "agent@aquaroute.ai",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AquaRoute",
  status: "online",
  lastSeen: new Date().toISOString(),
  role: "Assistant IA",
  department: "Système"
}

const initialConversation: Conversation = {
  id: "agent-conv",
  type: "direct",
  participants: ["current-user", "ai-agent"],
  name: "Agent AquaRoute",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AquaRoute",
  lastMessage: {
    id: "msg-0",
    content: "Bonjour ! Je suis l'agent AquaRoute AI. Comment puis-je vous aider ?",
    timestamp: new Date().toISOString(),
    senderId: "ai-agent"
  },
  unreadCount: 0,
  isPinned: true,
  isMuted: false
}

const initialMessages: Message[] = [
  {
    id: "msg-0",
    content: "Bonjour ! Je suis l'agent <strong>AquaRoute AI</strong>. Je peux vous aider à analyser la situation hydrique de la région RSK.\n\nVoici ce que je peux faire :\n- Analyser les niveaux de barrages\n- Interpréter la météo\n- Recommander des transferts\n- Évaluer les risques",
    timestamp: new Date().toISOString(),
    senderId: "ai-agent",
    type: "text",
    isEdited: false,
    reactions: [],
    replyTo: null
  }
]

const MOCK_RESPONSES: Record<string, string> = {
  'résumé situation rsk': "## Situation hydrique — Région RSK\n\n- **SMBA** : 95.8% (Normal)\n- **Zamrine** : 0.2% (Critique)\n\n**Synthèse** : Réserve totale à ~62.4%.",
  'risques 48h': "## Analyse des risques\n\nForte pluie prévue à J+2 (14-17 mm). **Risque élevé sur SMBA** (>95%). Option: vidange préventive.",
  'transferts optimaux': "## Transferts recommandés\n\n1. **SMBA → Zamrine** : 2 Mm³ (Urgence Absolue)\n2. **El Mellah → El Himer** : 0.8 Mm³\n\nCoût énergie estimé : ~6.2 kWh.",
}

function getResponse(input: string): string {
  const lower = input.toLowerCase()
  for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(key)) return val
  }
  return `Je comprends votre question sur "${input}".\n\nCependant, dans cette version PoC, je ne réponds qu'à certains scénarios comme "Résumé situation RSK", "Risques 48h" ou "Transferts optimaux".`
}

const initialConversations = [initialConversation]
const initialUsers = [currentUser, aiAgent]

export default function AgentPage() {
  const { messages, addMessage, setTyping } = useChat()

  // Message listener to simulate AI responses
  const currentMessages = messages["agent-conv"] || []
  const prevMessagesLength = useRef(initialMessages.length) // Start with initial length

  // We keep the initial messages in a ref so they don't trigger the Chat component's useEffect
  const initialMessagesProp = useRef({ "agent-conv": initialMessages }).current

  useEffect(() => {
    const len = currentMessages.length
    if (len > prevMessagesLength.current) {
      const lastMsg = currentMessages[len - 1]
      // If user sent a message, schedule AI reply
      if (lastMsg.senderId === "current-user") {
        setTyping("agent-conv", true)
        setTimeout(() => {
          const replyText = getResponse(lastMsg.content)
          const replyMsg: Message = {
            id: `msg-${Date.now()}`,
            content: replyText,
            timestamp: new Date().toISOString(),
            senderId: "ai-agent",
            type: "text",
            isEdited: false,
            reactions: [],
            replyTo: null
          }
          addMessage("agent-conv", replyMsg)
          setTyping("agent-conv", false)
        }, 1200)
      }
    }
    prevMessagesLength.current = len
  }, [currentMessages, addMessage, setTyping])

  return (
    <BaseLayout title="Agent AquaRoute" description="Conversation avec l'agent IA — Interface enrichie">
      <div className="px-4 md:px-6 h-[calc(100vh-140px)]">
        {/* We use the imported Chat component directly */}
        <Chat
          conversations={initialConversations}
          messages={initialMessagesProp}
          users={initialUsers}
        />
      </div>
    </BaseLayout>
  )
}
