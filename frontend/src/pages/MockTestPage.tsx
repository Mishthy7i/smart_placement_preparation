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
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import DashboardNavbar from "../components/DashboardNavbar";

type TestQuestion = {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
};

type TestDetails = {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
};

function MockTestPage() {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState<TestDetails | null>(null);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [answers, setAnswers] = useState<
        Record<number, "A" | "B" | "C" | "D">
    >({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get(`/tests/${testId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setTest(response.data.data.test);
                setQuestions(response.data.data.questions);
                setSecondsLeft(
                    response.data.data.test.duration_minutes * 60
                );
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError("Unable to load mock test");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [testId, navigate]);

    const submitTest = async (
        finalAnswers: Record<number, "A" | "B" | "C" | "D">
    ) => {
        if (submitting || result) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem("token");

            const response = await api.post(
                `/tests/${testId}/submit`,
                {
                    answers: Object.entries(finalAnswers).map(
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
        } catch {
            setError("Unable to submit mock test");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (loading || result || secondsLeft <= 0) return;

        const timer = window.setInterval(() => {
            setSecondsLeft((previous) => {
                if (previous <= 1) {
                    window.clearInterval(timer);
                    void submitTest(answers);
                    return 0;
                }

                return previous - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [loading, result, secondsLeft, answers]);

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

                <Button mt={4} onClick={() => navigate("/tests")}>
                    Back to Mock Tests
                </Button>
            </Container>
        );
    }

    if (result) {
        return (
            <Box minH="100vh" bg="gray.50">
                <DashboardNavbar />
                <Container maxW="container.md" py={{ base: 10, md: 16 }}>
                <Box bg="white" p={{ base: 6, md: 10 }} rounded="2xl" shadow="sm">
                    <Stack gap={5} textAlign="center">
                        <Text color="green.600" fontWeight="bold">
                            MOCK TEST COMPLETED
                        </Text>

                        <Heading>{test?.title}</Heading>

                        <Box bg="blue.50" p={6} rounded="xl">
                            <Text color="gray.600">Your Score</Text>

                            <Heading color="blue.700" fontSize="5xl" mt={2}>
                                {result.percentage}%
                            </Heading>

                            <Text mt={2}>
                                {result.score} out of {result.totalQuestions} correct
                            </Text>
                        </Box>

                        <Button
                            colorPalette="blue"
                            onClick={() => navigate("/dashboard")}
                        >
                            Back to Dashboard
                        </Button>
                    </Stack>
                </Box>
                </Container>
            </Box>
        );
    }

    const question = questions[currentQuestion];

    if (!question) {
        return (
            <Container maxW="container.md" py={12}>
                <Text>No questions are available for this test.</Text>
            </Container>
        );
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const options = [
        { value: "A", label: question.option_a },
        { value: "B", label: question.option_b },
        { value: "C", label: question.option_c },
        { value: "D", label: question.option_d },
    ];

    const handleNext = () => {
        if (!selectedOption) return;

        const updatedAnswers = {
            ...answers,
            [question.id]: selectedOption as "A" | "B" | "C" | "D",
        };

        setAnswers(updatedAnswers);

        if (currentQuestion < questions.length - 1) {
            const nextQuestion = questions[currentQuestion + 1];

            setCurrentQuestion((previous) => previous + 1);
            setSelectedOption(updatedAnswers[nextQuestion.id] || "");
        } else {
            void submitTest(updatedAnswers);
        }
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <DashboardNavbar />
            <Box bg="white" borderBottomWidth="1px">
                <Container maxW="container.lg" py={5}>
                    <Flex justify="space-between" align="center">
                        <Heading size="md" color="blue.700">
                            SmartPrep
                        </Heading>

                        <Box
                            px={4}
                            py={2}
                            rounded="full"
                            bg={secondsLeft <= 60 ? "red.50" : "blue.50"}
                            color={secondsLeft <= 60 ? "red.700" : "blue.700"}
                            fontWeight="bold"
                        >
                            {String(minutes).padStart(2, "0")}:
                            {String(seconds).padStart(2, "0")}
                        </Box>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <Text color="blue.600" fontWeight="bold" fontSize="sm">
                    MOCK ASSESSMENT
                </Text>

                <Heading mt={2}>{test?.title}</Heading>

                <Text mt={2} color="gray.600">
                    Question {currentQuestion + 1} of {questions.length}
                </Text>

                <Box mt={8} bg="white" p={{ base: 5, md: 8 }} rounded="2xl" shadow="sm">
                    <Box h="2" bg="gray.100" rounded="full" mb={8}>
                        <Box
                            h="full"
                            bg="blue.500"
                            rounded="full"
                            width={`${((currentQuestion + 1) / questions.length) * 100}%`}
                        />
                    </Box>

                    <Text color="gray.500" fontSize="sm">
                        Difficulty: {question.difficulty}
                    </Text>

                    <Heading size="md" lineHeight="1.5" mt={4}>
                        {question.question_text}
                    </Heading>

                    <RadioCard.Root
                        mt={8}
                        value={selectedOption}
                        onValueChange={(details) =>
                            setSelectedOption(details.value)
                        }
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
                        disabled={!selectedOption || submitting}
                        onClick={handleNext}
                    >
                        {currentQuestion === questions.length - 1
                            ? "Submit Test"
                            : "Next Question"}
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}

export default MockTestPage;
