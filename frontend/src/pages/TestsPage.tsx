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
import DashboardNavbar from "../components/DashboardNavbar";

type Test = {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    total_questions: number;
};

function TestsPage() {
    const navigate = useNavigate();

    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get("/tests", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setTests(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError("Unable to load mock tests");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTests();
    }, [navigate]);

    return (
        <Box minH="100vh" bg="gray.50">
            <DashboardNavbar />

            <Container maxW="7xl" py={{ base: 8, md: 12 }}>
                <Stack gap={2} mb={10}>
                    <Text color="blue.600" fontWeight="bold" fontSize="sm">
                        MOCK ASSESSMENTS
                    </Text>

                    <Heading>Test your placement readiness</Heading>

                    <Text color="gray.600">
                        Attempt timed assessments and review your performance.
                    </Text>
                </Stack>

                {loading && <Spinner color="blue.500" size="lg" />}

                {error && <Text color="red.500">{error}</Text>}

                {!loading && !error && tests.length === 0 && (
                    <Box bg="white" p={6} rounded="2xl" borderWidth="1px">
                        <Text color="gray.600">
                            No mock tests are available yet.
                        </Text>
                    </Box>
                )}

                {!loading && !error && tests.length > 0 && (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                        {tests.map((test) => (
                            <Box
                                key={test.id}
                                bg="white"
                                p={7}
                                rounded="2xl"
                                shadow="sm"
                                borderWidth="1px"
                                transition="all 0.2s"
                                _hover={{
                                    transform: "translateY(-4px)",
                                    shadow: "lg",
                                    borderColor: "blue.200",
                                }}
                            >
                                <Heading size="md">{test.title}</Heading>

                                <Text color="gray.600" mt={3} lineHeight="1.6">
                                    {test.description}
                                </Text>

                                <Flex gap={4} mt={5} color="gray.500" fontSize="sm">
                                    <Text>{test.total_questions} questions</Text>
                                    <Text>{test.duration_minutes} minutes</Text>
                                </Flex>

                                <Button
                                    mt={6}
                                    width="full"
                                    colorPalette="blue"
                                    onClick={() => navigate(`/tests/${test.id}`)}
                                >
                                    Start Test
                                </Button>
                            </Box>
                        ))}
                    </SimpleGrid>
                )}
            </Container>
        </Box>
    );
}

export default TestsPage;
