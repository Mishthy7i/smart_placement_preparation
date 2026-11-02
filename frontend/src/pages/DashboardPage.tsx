import { useEffect, useState } from "react";
import { Box, Button, Container, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import { api } from "../services/api";

type Topic = { id: number; name: string; description: string };
type Attempt = { id: number; topic_name: string; attempt_type: string; score: number; total_questions: number; percentage: number; completed_at: string };
type Summary = { total_attempts: number; questions_attempted: number; average_percentage: number };
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function DashboardPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const [topics, setTopics] = useState<Topic[]>([]);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([api.get("/topics", auth()), api.get("/attempts/history", auth()), api.get("/analytics/summary", auth())])
            .then(([topicsResponse, historyResponse, analyticsResponse]) => {
                setTopics(topicsResponse.data.data || []);
                setAttempts((historyResponse.data.data || []).slice(0, 5));
                setSummary(analyticsResponse.data.data?.overview?.[0] || null);
            })
            .catch((requestError: any) => {
                if (requestError.response?.status === 401) navigate("/login");
                else setError("Unable to load your dashboard");
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    useEffect(() => {
        if (location.hash) {
            window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [location.hash]);

    return <Box minH="100vh" bg="#f6f8fc"><DashboardNavbar /><Container maxW="7xl" py={{ base: 7, md: 10 }}>
        <Box bg="linear-gradient(135deg,#111d46,#2945a5)" color="white" rounded="3xl" p={{ base: 6, md: 9 }}>
            <Text color="blue.200" fontSize="sm" fontWeight="bold" letterSpacing="widest">STUDENT DASHBOARD</Text>
            <Heading mt={3} fontSize={{ base: "2xl", md: "4xl" }}>Welcome back, {user?.name || "Student"}</Heading>
            <Text mt={3} color="blue.100">Choose a topic, practise consistently, and keep your placement preparation moving forward.</Text>
        </Box>
        <SimpleGrid mt={7} columns={{ base: 1, md: 3 }} gap={4}>{[["Total attempts", summary?.total_attempts ?? 0], ["Questions solved", summary?.questions_attempted ?? 0], ["Average score", `${summary?.average_percentage ?? 0}%`]].map(([label, value]) => <Box key={String(label)} bg="white" p={5} rounded="xl" borderWidth="1px"><Text color="gray.500" fontSize="sm">{label}</Text><Heading mt={2} color="blue.700">{value}</Heading></Box>)}</SimpleGrid>
        <Flex id="topics" mt={10} justify="space-between" align="end"><Box><Text color="blue.600" fontSize="sm" fontWeight="bold">BUILD YOUR FOUNDATION</Text><Heading mt={1} size="lg">Practice by topic</Heading></Box><Button variant="outline" onClick={() => navigate("/recommendations")}>View recommendations</Button></Flex>
        {loading && <Spinner mt={8} />}{error && <Text mt={8} color="red.500">{error}</Text>}
        {!loading && !error && <SimpleGrid mt={5} columns={{ base: 1, md: 2, lg: 3 }} gap={5}>{topics.map((topic) => <Box key={topic.id} bg="white" p={6} rounded="xl" borderWidth="1px" _hover={{ shadow: "md", borderColor: "blue.200" }}><Heading size="md">{topic.name}</Heading><Text mt={3} color="gray.600" minH="48px">{topic.description}</Text><Button mt={5} colorPalette="blue" onClick={() => navigate(`/practice/${topic.id}`)}>Start practice</Button></Box>)}</SimpleGrid>}
        <Flex mt={12} justify="space-between" align="end"><Box><Text color="blue.600" fontSize="sm" fontWeight="bold">KEEP TRACK</Text><Heading mt={1} size="lg">Recent activity</Heading></Box><Button variant="outline" onClick={() => navigate("/history")}>View test history</Button></Flex>
        <Stack mt={5} gap={3}>{attempts.map((attempt) => <Flex key={attempt.id} bg="white" p={5} rounded="xl" borderWidth="1px" justify="space-between" align="center"><Box><Text fontWeight="bold">{attempt.topic_name || "Mock test"}</Text><Text color="gray.600" fontSize="sm">{attempt.attempt_type === "MOCK_TEST" ? "Mock test" : "Topic practice"} · {attempt.score}/{attempt.total_questions} correct</Text><Text color="gray.500" fontSize="xs" mt={1}>{new Date(attempt.completed_at).toLocaleDateString()}</Text></Box><Text fontWeight="bold" color={attempt.percentage >= 70 ? "green.600" : "orange.600"}>{attempt.percentage}%</Text></Flex>)}</Stack>
    </Container></Box>;
}
