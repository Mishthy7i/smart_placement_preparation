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
    BarChart3,
    BookOpenCheck,
    ClipboardCheck,
    LayoutDashboard,
    LogOut,
    Menu,
    Sparkles,
    X,
} from "lucide-react";
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
    topic_name: string;
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
};

type AnalyticsData = {
    overview: {
        total_attempts: number;
        questions_attempted: number;
        average_percentage: number;
    }[];
    topicPerformance: {
        topic_name: string;
        percentage: number | string;
    }[];
};

type Recommendation = {
    topicId: number;
    topicName: string;
    attempts: number;
    percentage: number | string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    message: string;
};

function DashboardPage() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [recommendations, setRecommendations] = useState<
        Recommendation[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [recommendationsLoading, setRecommendationsLoading] =
        useState(true);

    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");
    const [analyticsError, setAnalyticsError] = useState("");

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    const token = localStorage.getItem("token");

    const authConfig = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const response = await api.get("/topics", authConfig);
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
                const response = await api.get("/attempts/history", authConfig);
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
                const response = await api.get(
                    "/analytics/summary",
                    authConfig
                );
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

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await api.get(
                    "/recommendations",
                    authConfig
                );
                setRecommendations(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    handleLogout();
                }
            } finally {
                setRecommendationsLoading(false);
            }
        };

        fetchRecommendations();
    }, []);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
        });

        setMobileMenuOpen(false);
    };

    const overview = analytics?.overview?.[0];

    return (
        <Box minH="100vh" bg="#f6f8fc" color="gray.800">
            <Box
                position="sticky"
                top="0"
                zIndex="20"
                bg="rgba(255,255,255,0.9)"
                backdropFilter="blur(16px)"
                borderBottomWidth="1px"
                borderColor="gray.200"
            >
                <Container maxW="7xl" py={4}>
                    <Flex justify="space-between" align="center">
                        <Flex
                            align="center"
                            gap={3}
                            cursor="pointer"
                            onClick={() => navigate("/dashboard")}
                        >
                            <Box
                                bg="linear-gradient(135deg, #3155d9, #7657e8)"
                                color="white"
                                p={2}
                                rounded="xl"
                            >
                                <Sparkles size={18} />
                            </Box>

                            <Box>
                                <Heading size="md" color="gray.800">
                                    SmartPrep
                                </Heading>

                                <Text fontSize="xs" color="gray.500">
                                    Placement preparation portal
                                </Text>
                            </Box>
                        </Flex>

                        <Flex
                            display={{ base: "none", md: "flex" }}
                            align="center"
                            gap={2}
                        >
                            <Button
                                variant="subtle"
                                colorPalette="blue"
                                onClick={() => navigate("/dashboard")}
                            >
                                <LayoutDashboard size={16} />
                                Overview
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => scrollToSection("topics")}
                            >
                                <BookOpenCheck size={16} />
                                Practice
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => scrollToSection("analytics")}
                            >
                                <BarChart3 size={16} />
                                Performance
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/tests")}
                            >
                                <ClipboardCheck size={16} />
                                Mock Tests
                            </Button>

                            <Box h="28px" w="1px" bg="gray.200" mx={3} />

                            <Flex align="center" gap={3} mr={3}>
                                <Flex
                                    w="9"
                                    h="9"
                                    rounded="full"
                                    bg="blue.100"
                                    color="blue.700"
                                    align="center"
                                    justify="center"
                                    fontWeight="bold"
                                >
                                    {user?.name?.charAt(0)?.toUpperCase() || "S"}
                                </Flex>

                                <Box>
                                    <Text fontWeight="600" fontSize="sm">
                                        {user?.name || "Student"}
                                    </Text>

                                    <Text color="gray.500" fontSize="xs">
                                        Student account
                                    </Text>
                                </Box>
                            </Flex>

                            <Button
                                variant="outline"
                                colorPalette="red"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                Logout
                            </Button>
                        </Flex>

                        <Button
                            display={{ base: "flex", md: "none" }}
                            variant="ghost"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle dashboard navigation"
                        >
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </Button>
                    </Flex>

                    {mobileMenuOpen && (
                        <Stack display={{ base: "flex", md: "none" }} gap={3} pt={5}>
                            <Button
                                justifyContent="flex-start"
                                variant="ghost"
                                onClick={() => {
                                    navigate("/dashboard");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                <LayoutDashboard size={16} />
                                Overview
                            </Button>

                            <Button
                                justifyContent="flex-start"
                                variant="ghost"
                                onClick={() => scrollToSection("topics")}
                            >
                                <BookOpenCheck size={16} />
                                Practice
                            </Button>

                            <Button
                                justifyContent="flex-start"
                                variant="ghost"
                                onClick={() => scrollToSection("analytics")}
                            >
                                <BarChart3 size={16} />
                                Performance
                            </Button>
                            <Button
                                justifyContent="flex-start"
                                variant="ghost"
                                onClick={() => {
                                    navigate("/tests");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                <ClipboardCheck size={16} />
                                Mock Tests
                            </Button>

                            <Button
                                justifyContent="flex-start"
                                variant="ghost"
                                colorPalette="red"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                Logout
                            </Button>
                        </Stack>
                    )}
                </Container>
            </Box>

            <Container maxW="7xl" py={{ base: 8, md: 12 }}>
                <Box
                    bg="linear-gradient(135deg, #101b3d, #263b9a)"
                    color="white"
                    rounded="3xl"
                    p={{ base: 6, md: 10 }}
                    mb={12}
                    overflow="hidden"
                    position="relative"
                >
                    <Box
                        position="absolute"
                        w="280px"
                        h="280px"
                        rounded="full"
                        bg="blue.400"
                        opacity=".25"
                        filter="blur(70px)"
                        right="-80px"
                        top="-120px"
                    />

                    <Box position="relative">
                        <Text color="blue.200" fontSize="sm" fontWeight="bold">
                            YOUR PREPARATION OVERVIEW
                        </Text>

                        <Heading mt={3} fontSize={{ base: "2xl", md: "4xl" }}>
                            Welcome back, {user?.name || "Student"}.
                        </Heading>

                        <Text mt={3} color="blue.100" maxW="650px">
                            Keep building momentum. Choose a topic, review your
                            performance and focus on the areas that need attention.
                        </Text>
                    </Box>
                </Box>

                <Box id="topics">
                    <Heading size="lg" mb={5}>
                        Practice by Topic
                    </Heading>

                    {loading && <Spinner color="blue.500" size="lg" />}

                    {error && <Text color="red.500">{error}</Text>}

                    {!loading && !error && (
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
                                    <Heading size="md">{topic.name}</Heading>

                                    <Text color="gray.600" mt={3} lineHeight="1.6">
                                        {topic.description}
                                    </Text>

                                    <Button
                                        mt={6}
                                        colorPalette="blue"
                                        onClick={() => navigate(`/practice/${topic.id}`)}
                                    >
                                        Start Practice
                                    </Button>
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </Box>

                <Box id="analytics" mt={16}>
                    <Heading size="lg" mb={5}>
                        Performance Analytics
                    </Heading>

                    {analyticsLoading && <Spinner color="blue.500" />}

                    {analyticsError && (
                        <Text color="red.500">{analyticsError}</Text>
                    )}

                    {!analyticsLoading && analytics && (
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

                <Box mt={16}>
                    <Heading size="lg" mb={5}>
                        Personalized Recommendations
                    </Heading>

                    {recommendationsLoading && (
                        <Spinner color="blue.500" />
                    )}

                    <Stack gap={4}>
                        {recommendations.map((recommendation) => {
                            const percentage = Number(recommendation.percentage);

                            const color =
                                recommendation.priority === "HIGH"
                                    ? "red"
                                    : recommendation.priority === "MEDIUM"
                                        ? "orange"
                                        : "green";

                            return (
                                <Flex
                                    key={recommendation.topicId}
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
                                        <Flex align="center" gap={3} wrap="wrap">
                                            <Heading size="sm">
                                                {recommendation.topicName}
                                            </Heading>

                                            <Box
                                                px={3}
                                                py={1}
                                                rounded="full"
                                                bg={`${color}.50`}
                                                color={`${color}.700`}
                                                fontSize="xs"
                                                fontWeight="bold"
                                            >
                                                {recommendation.priority}
                                            </Box>
                                        </Flex>

                                        <Text color="gray.600" mt={2}>
                                            {recommendation.message}
                                        </Text>

                                        <Text color="gray.500" fontSize="sm" mt={1}>
                                            Current performance: {percentage}%
                                        </Text>
                                    </Box>

                                    <Button
                                        colorPalette="blue"
                                        onClick={() =>
                                            navigate(`/practice/${recommendation.topicId}`)
                                        }
                                    >
                                        Practice Now
                                    </Button>
                                </Flex>
                            );
                        })}
                    </Stack>
                </Box>

                <Box mt={16}>
                    <Heading size="lg" mb={5}>
                        Recent Practice History
                    </Heading>

                    {historyLoading && <Spinner color="blue.500" />}

                    {historyError && (
                        <Text color="red.500">{historyError}</Text>
                    )}

                    {!historyLoading && attempts.length === 0 && (
                        <Box bg="white" p={6} rounded="2xl" borderWidth="1px">
                            <Text color="gray.600">
                                You have not completed any practice sessions yet.
                            </Text>
                        </Box>
                    )}

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
        <Box bg="white" p={6} rounded="2xl" shadow="sm" borderWidth="1px">
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