import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Box, Button, Container, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react";
import DashboardNavbar from "../components/DashboardNavbar";
import { api } from "../services/api";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I’m your SmartPrep placement coach. Ask me about your preparation, interviews, resume, or coding practice." },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (value = question) => {
    const text = value.trim();
    if (!text || loading) return;
    setQuestion("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);
    try {
      const response = await api.post("/coach/chat", { question: text }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const answer = response.data.data.answer;
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (requestError) {
      console.error(requestError);
      const message = requestError instanceof Error ? requestError.message : "Unknown WebLLM error";
      setError(`The local model could not start: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="#f7f9fc">
      <DashboardNavbar />
      <Container maxW="4xl" py={{ base: 8, md: 12 }}>
        <Flex align="center" gap={3}><Flex w="12" h="12" rounded="xl" bg="blue.600" color="white" align="center" justify="center"><Bot /></Flex><Box><Text color="blue.600" fontWeight="800" fontSize="sm" letterSpacing=".12em">SMARTPREP COACH</Text><Heading color="#111b3d">Your personal placement coach</Heading></Box></Flex>
        <Text mt={3} color="gray.600">Powered locally in your browser. Your chat is not sent to Gemini in this first version.</Text>

        <Flex gap={3} wrap="wrap" mt={6}>
          {["What should I practice today?", "Make me a 7-day plan", "How can I improve my interviews?"].map((prompt) => <Button key={prompt} size="sm" variant="outline" onClick={() => void sendMessage(prompt)}><Sparkles size={14} />{prompt}</Button>)}
        </Flex>

        <Box mt={6} bg="white" rounded="2xl" borderWidth="1px" borderColor="gray.200" shadow="sm" overflow="hidden">
          <Stack p={{ base: 4, md: 6 }} gap={5} maxH="60vh" overflowY="auto">
            {messages.map((message, index) => <Flex key={`${message.role}-${index}`} justify={message.role === "user" ? "flex-end" : "flex-start"}><Box maxW="85%" bg={message.role === "user" ? "blue.600" : "gray.100"} color={message.role === "user" ? "white" : "gray.800"} px={4} py={3} rounded="xl" css={{ "& p": { marginBottom: "0.65rem" }, "& p:last-child": { marginBottom: 0 }, "& ul, & ol": { paddingLeft: "1.25rem", marginBottom: "0.65rem" }, "& li": { marginBottom: "0.25rem" }, "& strong": { fontWeight: 700 }, "& code": { background: message.role === "user" ? "rgba(255,255,255,.18)" : "#e2e8f0", padding: "0.1rem 0.3rem", borderRadius: "0.25rem" } }}><ReactMarkdown>{message.content}</ReactMarkdown></Box></Flex>)}
            {loading && <Text color="gray.500">Gemini coach is thinking…</Text>}
          </Stack>
          {error && <Text color="red.500" px={6} pb={3}>{error}</Text>}
          <Flex borderTopWidth="1px" p={4} gap={3}>
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder="Ask your placement coach..." />
            <Button colorPalette="blue" onClick={() => void sendMessage()} loading={loading}><Send size={16} /> Send</Button>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}

export default CoachPage;
