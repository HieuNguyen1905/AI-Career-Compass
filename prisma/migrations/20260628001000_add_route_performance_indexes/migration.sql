-- Keep frequently loaded route lists under the response-time budget.
CREATE INDEX IF NOT EXISTS "User_createdAt_idx"
ON "User"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Conversation_userId_updatedAt_idx"
ON "Conversation"("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_id_idx"
ON "Message"("conversationId", "createdAt" DESC, "id" DESC);
