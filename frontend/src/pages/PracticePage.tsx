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
import DashboardNavbar from "../components/DashboardNavbar";

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

type AnswerOption = "A" | "B" | "C" | "D";

function PracticePage() {
    const { topicId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, AnswerOption>>({});
    const [result, setResult] = useState<{
        score: number;
        totalQuestions: number;
        percentage: number;
    } | null>(null);
    const [recommendedDifficulty, setRecommendedDifficulty] = useState<
        "EASY" | "MEDIUM" | "HARD"
    >("EASY");

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get(
                    `/topics/${topicId}/adaptive-questions?count=5`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setQuestions(response.data.data.questions);
                setRecommendedDifficulty(
                    response.data.data.recommendedDifficulty
                );
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

    const handleNext = async () => {
        if (!selectedOption) return;

        const currentQuestionData = questions[currentQuestion];

        const updatedAnswers = {
            ...answers,
            [currentQuestionData.id]: selectedOption as AnswerOption,
        };

        setAnswers(updatedAnswers);

        if (currentQuestion < questions.length - 1) {
            const nextQuestion = questions[currentQuestion + 1];

            setCurrentQuestion((previous) => previous + 1);
            setSelectedOption(updatedAnswers[nextQuestion.id] || "");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const response = await api.post(
                "/attempts",
                {
                    topicId: Number(topicId),
                    answers: Object.entries(updatedAnswers).map(
                        ([questionId, selectedOption]) => ({
                            questionId: Number(questionId),
                            selectedOption,
                        })
                    ),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setResult(response.data.data);
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
            } else {
                setError("Unable to submit your practice attempt");
            }
        }
    };

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

    if (result) {
        return (
            <Box minH="100vh" bg="gray.50">
                <Container maxW="container.md" py={{ base: 10, md: 16 }}>
                    <Box bg="white" p={{ base: 6, md: 10 }} rounded="2xl" shadow="sm">
                        <Stack gap={5} textAlign="center">
                            <Text color="green.600" fontWeight="bold">
                                PRACTICE COMPLETED
                            </Text>

                            <Heading>Great work!</Heading>

                            <Text color="gray.600">
                                You completed all questions in this practice session.
                            </Text>

                            <Box bg="blue.50" p={6} rounded="xl">
                                <Text fontSize="sm" color="gray.600">
                                    Your Score
                                </Text>

                                <Heading mt={2} color="blue.700" fontSize="5xl">
                                    {result.percentage}%
                                </Heading>

                                <Text mt={2}>
                                    {result.score} out of {result.totalQuestions} correct
                                </Text>
                            </Box>

                            <Flex justify="center" gap={4} wrap="wrap">
                                <Button colorPalette="blue" asChild>
                                    <RouterLink to="/dashboard">Back to Dashboard</RouterLink>
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                >
                                    Try Again
                                </Button>
                            </Flex>
                        </Stack>
                    </Box>
                </Container>
            </Box>
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

    return (
        <Box minH="100vh" bg="gray.50">
            <DashboardNavbar />

            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <Text color="blue.600" fontWeight="bold" fontSize="sm">
                    TOPIC PRACTICE
                </Text>
                <Flex mt={3} align="center" gap={3}>
                    <Text color="gray.600">
                        Your recommended level:
                    </Text>

                    <Box
                        px={3}
                        py={1}
                        rounded="full"
                        fontSize="sm"
                        fontWeight="bold"
                        bg={
                            recommendedDifficulty === "EASY"
                                ? "green.50"
                                : recommendedDifficulty === "MEDIUM"
                                    ? "orange.50"
                                    : "red.50"
                        }
                        color={
                            recommendedDifficulty === "EASY"
                                ? "green.700"
                                : recommendedDifficulty === "MEDIUM"
                                    ? "orange.700"
                                    : "red.700"
                        }
                    >
                        {recommendedDifficulty}
                    </Box>
                </Flex>

                <Heading mt={2}>Practice Questions</Heading>

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
