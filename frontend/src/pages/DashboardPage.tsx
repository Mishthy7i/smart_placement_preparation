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

function DashboardPage() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

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

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

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
            </Container>
        </Box>
    );
}

export default DashboardPage;