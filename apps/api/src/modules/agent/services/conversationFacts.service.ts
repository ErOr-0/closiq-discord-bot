import type { AgentConversationFacts, AgentConversationMessage } from "../types/agentRuntime";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/;
const nameIntroPattern = /\b(?:my name is|name is|i am|i'm)\s+([a-z][a-z\s.'-]{1,60})\b/i;
const numericOrderPattern = /\b(\d+)\s+([a-z][a-z0-9\s.'-]*?)\s+to\s+(.+)$/i;
const wordOrderPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-z][a-z0-9\s.'-]*?)\s+to\s+(.+)$/i;

const quantityWords: Record<string, number> = {
  eight: 8,
  five: 5,
  four: 4,
  nine: 9,
  one: 1,
  seven: 7,
  six: 6,
  ten: 10,
  three: 3,
  two: 2,
};

export function buildConversationFacts(
  history: AgentConversationMessage[],
  currentMessage: AgentConversationMessage,
  payload: { authorName?: string }
): AgentConversationFacts {
  const messages = [...history, currentMessage];
  const inboundMessages = messages.filter((message) => message.direction === "inbound");
  const outboundMessages = messages.filter((message) => message.direction === "outbound");
  const previousAssistantMessage = [...outboundMessages].reverse()[0]?.content ?? "";

  return {
    customerName: extractCustomerName(inboundMessages, previousAssistantMessage),
    email: extractLastMatch(inboundMessages, emailPattern),
    phone: extractLastMatch(inboundMessages, phonePattern),
    ...extractOrderFacts(inboundMessages),
    lastRequestedField: resolveLastRequestedField(previousAssistantMessage),
  };
}

export function removeCurrentMessageFromHistory(
  history: AgentConversationMessage[],
  currentMessage: string
) {
  const currentContent = normalizeContent(currentMessage);
  const lastMessage = history[history.length - 1];

  if (
    lastMessage?.direction === "inbound" &&
    normalizeContent(lastMessage.content) === currentContent
  ) {
    return history.slice(0, -1);
  }

  return history;
}

function extractCustomerName(
  inboundMessages: AgentConversationMessage[],
  previousAssistantMessage: string
) {
  for (const message of [...inboundMessages].reverse()) {
    const explicitName = message.content.match(nameIntroPattern)?.[1];

    if (explicitName) {
      return cleanName(explicitName);
    }
  }

  const lastInboundMessage = inboundMessages[inboundMessages.length - 1]?.content.trim();

  if (
    /full name|your name|provide.*name/i.test(previousAssistantMessage) &&
    lastInboundMessage &&
    isLikelyNameAnswer(lastInboundMessage)
  ) {
    return cleanName(lastInboundMessage);
  }

  return undefined;
}

function extractOrderFacts(inboundMessages: AgentConversationMessage[]) {
  for (const message of [...inboundMessages].reverse()) {
    const content = message.content.trim();
    const numericMatch = content.match(numericOrderPattern);

    if (numericMatch) {
      return {
        quantity: Number(numericMatch[1]),
        productName: cleanProductName(numericMatch[2]),
        shippingAddress: cleanShippingAddress(numericMatch[3]),
      };
    }

    const wordMatch = content.match(wordOrderPattern);

    if (wordMatch) {
      return {
        quantity: quantityWords[wordMatch[1].toLowerCase()],
        productName: cleanProductName(wordMatch[2]),
        shippingAddress: cleanShippingAddress(wordMatch[3]),
      };
    }
  }

  return {};
}

function extractLastMatch(messages: AgentConversationMessage[], pattern: RegExp) {
  for (const message of [...messages].reverse()) {
    const match = message.content.match(pattern)?.[0];

    if (match) {
      return match.trim();
    }
  }

  return undefined;
}

function resolveLastRequestedField(previousAssistantMessage: string): AgentConversationFacts["lastRequestedField"] {
  if (/full name|your name|provide.*name/i.test(previousAssistantMessage)) {
    return "customerName";
  }

  if (/email address|provide.*email/i.test(previousAssistantMessage)) {
    return "emailAddress";
  }

  if (/phone number|provide.*phone/i.test(previousAssistantMessage)) {
    return "phoneNumber";
  }

  if (/item|quantity|order details/i.test(previousAssistantMessage)) {
    return "orderDetails";
  }

  if (/delivery address|shipping address|where should/i.test(previousAssistantMessage)) {
    return "shippingAddress";
  }

  return undefined;
}

function isLikelyNameAnswer(value: string) {
  const trimmed = value.trim();

  return (
    /^[a-z][a-z\s.'-]{1,60}$/i.test(trimmed) &&
    trimmed.split(/\s+/).length <= 5 &&
    !emailPattern.test(trimmed) &&
    !/\d/.test(trimmed)
  );
}

function cleanName(value: string) {
  return value
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}

function cleanProductName(value: string) {
  return value
    .replace(/\bplease\b/gi, "")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}

function cleanShippingAddress(value: string) {
  return value
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}

function normalizeContent(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
