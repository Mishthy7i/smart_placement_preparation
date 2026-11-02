import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    SimpleGrid,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type Topic = {
    id: number;
    name: string;
    description: string;
};

type Attempt = {
    id: number;
    topic_id: number;
    topic_name: string;
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
};

function DashboardPage() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get("/topics", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setTopics(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    handleLogout();
                } else {
                    setError("Unable to load topics");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTopics();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get("/attempts/history", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setAttempts(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    handleLogout();
                } else {
                    setHistoryError("Unable to load practice history");
                }
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, []);

    return (
        <Box minH="100vh" bg="gray.50">
            <Box bg="white" borderBottomWidth="1px">
                <Container maxW="7xl" py={5}>
                    <Flex justify="space-between" align="center">
                        <Heading size="md" color="blue.700">
                            SmartPrep
                        </Heading>

                        <Button variant="outline" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="7xl" py={{ base: 8, md: 12 }}>
                <Stack gap={2} mb={10}>
                    <Text color="blue.600" fontWeight="bold" fontSize="sm">
                        STUDENT DASHBOARD
                    </Text>

                    <Heading color="gray.800">
                        Welcome, {user?.name || "Student"}!
                    </Heading>

                    <Text color="gray.600">
                        Choose a topic and continue your preparation.
                    </Text>
                </Stack>

                <Heading size="lg" mb={5}>
                    Practice by Topic
                </Heading>

                {loading && <Spinner color="blue.500" size="lg" />}

                {error && (
                    <Text color="red.500" mb={5}>
                        {error}
                    </Text>
                )}

                {!loading && !error && topics.length === 0 && (
                    <Box bg="white" p={6} rounded="2xl" borderWidth="1px">
                        <Text color="gray.600">No topics are available yet.</Text>
                    </Box>
                )}

                {!loading && !error && topics.length > 0 && (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                        {topics.map((topic) => (
                            <Box
                                key={topic.id}
                                bg="white"
                                p={7}
                                rounded="2xl"
                                shadow="sm"
                                borderWidth="1px"
                                borderColor="gray.100"
                                transition="all 0.2s"
                                _hover={{
                                    transform: "translateY(-4px)",
                                    shadow: "lg",
                                    borderColor: "blue.200",
                                }}
                            >
                                <Heading size="md" color="gray.800">
                                    {topic.name}
                                </Heading>

                                <Text color="gray.600" mt={3} lineHeight="1.6">
                                    {topic.description}
                                </Text>

                                <Button
                                    mt={6}
                                    colorPalette="blue"
                                    variant="outline"
                                    onClick={() => navigate(`/practice/${topic.id}`)}
                                >
                                    Start Practice
                                </Button>
                            </Box>
                        ))}
                    </SimpleGrid>
                )}

                <Box mt={12}>
                    <Heading size="lg" mb={5}>
                        Recent Practice History
                    </Heading>

                    {historyLoading && <Spinner color="blue.500" />}

                    {historyError && (
                        <Text color="red.500">{historyError}</Text>
                    )}

                    {!historyLoading && !historyError && attempts.length === 0 && (
                        <Box bg="white" p={6} rounded="2xl" borderWidth="1px">
                            <Text color="gray.600">
                                You have not completed any practice sessions yet.
                            </Text>
                        </Box>
                    )}

                    {!historyLoading && !historyError && attempts.length > 0 && (
                        <Stack gap={4}>
                            {attempts.map((attempt) => (
                                <Flex
                                    key={attempt.id}
                                    bg="white"
                                    p={5}
                                    rounded="xl"
                                    borderWidth="1px"
                                    justify="space-between"
                                    align={{ base: "flex-start", md: "center" }}
                                    direction={{ base: "column", md: "row" }}
                                    gap={4}
                                >
                                    <Box>
                                        <Heading size="sm">{attempt.topic_name}</Heading>

                                        <Text color="gray.600" fontSize="sm" mt={1}>
                                            {attempt.score} out of {attempt.total_questions} correct
                                        </Text>

                                        <Text color="gray.500" fontSize="xs" mt={1}>
                                            Completed:{" "}
                                            {new Date(attempt.completed_at).toLocaleDateString()}
                                        </Text>
                                    </Box>

                                    <Box
                                        px={4}
                                        py={2}
                                        rounded="full"
                                        bg={attempt.percentage >= 70 ? "green.50" : "orange.50"}
                                        color={
                                            attempt.percentage >= 70
                                                ? "green.700"
                                                : "orange.700"
                                        }
                                        fontWeight="bold"
                                    >
                                        {attempt.percentage}%
                                    </Box>
                                </Flex>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Container>
        </Box>
    );
}

export default DashboardPage;