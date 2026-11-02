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

type AnswerFeedback = {
    isCorrect: boolean;
    correctOption: AnswerOption;
    explanation: string;
};

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
    const [practiceMode, setPracticeMode] = useState<"adaptive" | "free">("adaptive");
    const [freeDifficulty, setFreeDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
    const [checkingAnswer, setCheckingAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const token = localStorage.getItem("token");

                const endpoint = practiceMode === "adaptive"
                    ? `/topics/${topicId}/adaptive-questions?count=5`
                    : `/topics/${topicId}/questions?difficulty=${freeDifficulty}`;

                const response = await api.get(
                    endpoint,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setQuestions(response.data.data.questions || response.data.data);
                setRecommendedDifficulty(
                    response.data.data.recommendedDifficulty || freeDifficulty
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
    }, [topicId, navigate, practiceMode, freeDifficulty]);

    const handleNext = async () => {
        if (!selectedOption) return;

        const currentQuestionData = questions[currentQuestion];

        const updatedAnswers = {
            ...answers,
            [currentQuestionData.id]: selectedOption as AnswerOption,
        };

        setAnswers(updatedAnswers);

        if (!feedback) {
            try {
                setCheckingAnswer(true);
                const token = localStorage.getItem("token");
                const response = await api.post(
                    `/questions/${currentQuestionData.id}/check`,
                    { selectedOption },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setFeedback(response.data.data);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError("Unable to check this answer");
                }
            } finally {
                setCheckingAnswer(false);
            }
            return;
        }

        if (currentQuestion < questions.length - 1) {
            const nextQuestion = questions[currentQuestion + 1];

            setCurrentQuestion((previous) => previous + 1);
            setSelectedOption(updatedAnswers[nextQuestion.id] || "");
            setFeedback(null);
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

    const goToQuestion = (index: number) => {
        if (index === currentQuestion) return;
        const nextQuestion = questions[index];
        setCurrentQuestion(index);
        setSelectedOption(answers[nextQuestion.id] || "");
        setFeedback(null);
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

                <Flex mt={6} gap={3} align="center" wrap="wrap">
                    <Button
                        size="sm"
                        variant={practiceMode === "adaptive" ? "solid" : "outline"}
                        colorPalette="blue"
                        onClick={() => {
                            setPracticeMode("adaptive");
                            setQuestions([]);
                            setCurrentQuestion(0);
                            setSelectedOption("");
                            setFeedback(null);
                            setLoading(true);
                        }}
                    >
                        Adaptive Mode
                    </Button>
                    <Button
                        size="sm"
                        variant={practiceMode === "free" ? "solid" : "outline"}
                        colorPalette="blue"
                        onClick={() => {
                            setPracticeMode("free");
                            setQuestions([]);
                            setCurrentQuestion(0);
                            setSelectedOption("");
                            setFeedback(null);
                            setLoading(true);
                        }}
                    >
                        Free Learning Mode
                    </Button>

                    {practiceMode === "free" && (
                        <select
                            value={freeDifficulty}
                            onChange={(event) => {
                                setFreeDifficulty(event.target.value as "EASY" | "MEDIUM" | "HARD");
                                setQuestions([]);
                                setCurrentQuestion(0);
                                setSelectedOption("");
                                setFeedback(null);
                                setLoading(true);
                            }}
                            style={{
                                height: "32px",
                                border: "1px solid #CBD5E0",
                                borderRadius: "6px",
                                padding: "0 10px",
                                background: "white",
                            }}
                        >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                        </select>
                    )}
                </Flex>

                <Flex mt={6} gap={2} wrap="wrap">
                    {questions.map((item, index) => (
                        <Button
                            key={item.id}
                            size="sm"
                            variant={index === currentQuestion ? "solid" : "outline"}
                            colorPalette={answers[item.id] ? "green" : "gray"}
                            onClick={() => goToQuestion(index)}
                        >
                            {index + 1}
                        </Button>
                    ))}
                </Flex>

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
                        onValueChange={(details) => {
                            setSelectedOption(details.value);
                            setFeedback(null);
                        }}
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

                    {feedback && (
                        <Box
                            mt={6}
                            p={5}
                            rounded="xl"
                            bg={feedback.isCorrect ? "green.50" : "red.50"}
                            borderWidth="1px"
                            borderColor={feedback.isCorrect ? "green.200" : "red.200"}
                        >
                            <Text
                                fontWeight="bold"
                                color={feedback.isCorrect ? "green.700" : "red.700"}
                            >
                                {feedback.isCorrect ? "Correct answer" : `Not quite. Correct option: ${feedback.correctOption}`}
                            </Text>
                            <Text mt={2} color="gray.700" lineHeight="1.7">
                                {feedback.explanation}
                            </Text>
                        </Box>
                    )}

                    <Button
                        mt={8}
                        width="full"
                        colorPalette="blue"
                        disabled={!selectedOption || checkingAnswer}
                        onClick={handleNext}
                    >
                        {checkingAnswer
                            ? "Checking..."
                            : !feedback
                                ? "Check Answer"
                                : currentQuestion === questions.length - 1
                                    ? "Finish Practice"
                                    : "Next Question"}
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}

export default PracticePage;
