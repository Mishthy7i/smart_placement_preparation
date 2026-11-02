import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    RadioCard,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

type Question = {
    id: number;
    topic_id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
};

function PracticePage() {
    const { topicId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [topicName, setTopicName] = useState("Topic Practice");
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get(`/topics/${topicId}/questions`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setQuestions(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError("Unable to load questions");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [topicId, navigate]);

    if (loading) {
        return (
            <Flex minH="100vh" align="center" justify="center">
                <Spinner size="xl" color="blue.500" />
            </Flex>
        );
    }

    if (error) {
        return (
            <Container maxW="container.md" py={12}>
                <Text color="red.500">{error}</Text>
                <Button mt={4} asChild>
                    <RouterLink to="/dashboard">Back to Dashboard</RouterLink>
                </Button>
            </Container>
        );
    }

    if (questions.length === 0) {
        return (
            <Container maxW="container.md" py={12}>
                <Heading size="lg">No questions available</Heading>
                <Text mt={3} color="gray.600">
                    Questions for this topic will be added soon.
                </Text>

                <Button mt={6} asChild>
                    <RouterLink to="/dashboard">Back to Dashboard</RouterLink>
                </Button>
            </Container>
        );
    }

    const question = questions[currentQuestion];

    const options = [
        { value: "A", label: question.option_a },
        { value: "B", label: question.option_b },
        { value: "C", label: question.option_c },
        { value: "D", label: question.option_d },
    ];

    const handleNext = () => {
        if (!selectedOption) return;

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion((previous) => previous + 1);
            setSelectedOption("");
        } else {
            setTopicName("Practice completed");
        }
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <Box bg="white" borderBottomWidth="1px">
                <Container maxW="container.lg" py={5}>
                    <Flex justify="space-between" align="center">
                        <Heading size="md" color="blue.700">
                            SmartPrep
                        </Heading>

                        <Button variant="outline" asChild>
                            <RouterLink to="/dashboard">Back to Dashboard</RouterLink>
                        </Button>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <Text color="blue.600" fontWeight="bold" fontSize="sm">
                    TOPIC PRACTICE
                </Text>

                <Heading mt={2}>{topicName}</Heading>

                <Text mt={2} color="gray.600">
                    Question {currentQuestion + 1} of {questions.length}
                </Text>

                <Box mt={8} bg="white" p={{ base: 5, md: 8 }} rounded="2xl" shadow="sm">
                    <Flex justify="space-between" align="center" mb={6}>
                        <Text color="gray.500" fontSize="sm">
                            Difficulty: {question.difficulty}
                        </Text>

                        <Text color="gray.500" fontSize="sm">
                            {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
                        </Text>
                    </Flex>

                    <Box h="2" bg="gray.100" rounded="full" mb={8}>
                        <Box
                            h="full"
                            bg="blue.500"
                            rounded="full"
                            width={`${((currentQuestion + 1) / questions.length) * 100}%`}
                        />
                    </Box>

                    <Heading size="md" lineHeight="1.5">
                        {question.question_text}
                    </Heading>

                    <RadioCard.Root
                        mt={8}
                        value={selectedOption}
                        onValueChange={(details) => setSelectedOption(details.value)}
                    >
                        <Stack gap={3}>
                            {options.map((option) => (
                                <RadioCard.Item key={option.value} value={option.value}>
                                    <RadioCard.ItemHiddenInput />
                                    <RadioCard.ItemControl>
                                        <RadioCard.ItemContent>
                                            <RadioCard.ItemText>
                                                <Text fontWeight="bold">
                                                    {option.value}. {option.label}
                                                </Text>
                                            </RadioCard.ItemText>
                                        </RadioCard.ItemContent>
                                        <RadioCard.ItemIndicator />
                                    </RadioCard.ItemControl>
                                </RadioCard.Item>
                            ))}
                        </Stack>
                    </RadioCard.Root>

                    <Button
                        mt={8}
                        width="full"
                        colorPalette="blue"
                        disabled={!selectedOption}
                        onClick={handleNext}
                    >
                        {currentQuestion === questions.length - 1
                            ? "Finish Practice"
                            : "Next Question"}
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}

export default PracticePage;