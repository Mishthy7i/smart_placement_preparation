import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
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

type AnalyticsData = {
    overview: {
        total_attempts: number;
        questions_correct: number;
        questions_attempted: number;
        average_percentage: number;
    }[];
    topicPerformance: {
        topic_name: string;
        attempts: number;
        correct_answers: number;
        total_questions: number;
        percentage: number;
    }[];
    scoreTrend: {
        date: string;
        percentage: number;
    }[];
};

function DashboardPage() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");
    const [analyticsError, setAnalyticsError] = useState("");

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

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get("/analytics/summary", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setAnalytics(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    handleLogout();
                } else {
                    setAnalyticsError("Unable to load performance analytics");
                }
            } finally {
                setAnalyticsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const overview = analytics?.overview?.[0];

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
                        Choose a topic, practice consistently and track your progress.
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

                <Box mt={14}>
                    <Heading size="lg" mb={5}>
                        Performance Analytics
                    </Heading>

                    {analyticsLoading && <Spinner color="blue.500" />}

                    {analyticsError && (
                        <Text color="red.500">{analyticsError}</Text>
                    )}

                    {!analyticsLoading && !analyticsError && analytics && (
                        <>
                            <SimpleGrid columns={{ base: 1, md: 3 }} gap={5}>
                                <AnalyticsCard
                                    label="Total Attempts"
                                    value={overview?.total_attempts ?? 0}
                                />

                                <AnalyticsCard
                                    label="Questions Solved"
                                    value={overview?.questions_attempted ?? 0}
                                />

                                <AnalyticsCard
                                    label="Average Score"
                                    value={`${overview?.average_percentage ?? 0}%`}
                                />
                            </SimpleGrid>

                            {analytics.topicPerformance.length > 0 && (
                                <Box
                                    bg="white"
                                    mt={6}
                                    p={{ base: 4, md: 6 }}
                                    rounded="2xl"
                                    shadow="sm"
                                    borderWidth="1px"
                                >
                                    <Heading size="md" mb={5}>
                                        Topic-wise Performance
                                    </Heading>

                                    <Box width="100%" height={{ base: "280px", md: "340px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={analytics.topicPerformance}
                                                margin={{
                                                    top: 10,
                                                    right: 10,
                                                    left: 0,
                                                    bottom: 45,
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />

                                                <XAxis
                                                    dataKey="topic_name"
                                                    angle={-25}
                                                    textAnchor="end"
                                                    interval={0}
                                                    height={65}
                                                />

                                                <YAxis
                                                    domain={[0, 100]}
                                                    tickFormatter={(value) => `${value}%`}
                                                />

                                                <Tooltip
                                                    formatter={(value) => [
                                                        `${value}%`,
                                                        "Performance",
                                                    ]}
                                                />

                                                <Bar
                                                    dataKey="percentage"
                                                    name="Performance"
                                                    fill="#3182CE"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Box>
                            )}
                        </>
                    )}
                </Box>

                <Box mt={14}>
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

function AnalyticsCard({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <Box
            bg="white"
            p={6}
            rounded="2xl"
            shadow="sm"
            borderWidth="1px"
        >
            <Text color="gray.500" fontSize="sm">
                {label}
            </Text>

            <Heading mt={2} color="blue.700">
                {value}
            </Heading>
        </Box>
    );
}

export default DashboardPage;