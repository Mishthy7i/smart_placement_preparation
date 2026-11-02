import { useState } from "react";
import {
    Box,
    Button,
    Container,
    Field,
    Heading,
    Input,
    Link,
    Stack,
    Text,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

function RegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async () => {
        setError("");

        try {
            await api.post("/auth/register", {
                name,
                email,
                password,
            });

            navigate("/login");
        } catch (error: any) {
            setError(
                error.response?.data?.message ||
                "Registration failed. Please try again."
            );
        }
    };

    return (
        <Box minH="100vh" bg="gray.50" display="flex" alignItems="center">
            <Container maxW="md">
                <Box bg="white" p={{ base: 6, md: 10 }} rounded="2xl" shadow="lg">
                    <Stack gap={6}>
                        <Box textAlign="center">
                            <Heading size="xl" color="blue.700">
                                Create your account
                            </Heading>

                            <Text mt={2} color="gray.600">
                                Start your placement preparation journey.
                            </Text>
                        </Box>

                        <Stack gap={4}>
                            <Field.Root>
                                <Field.Label>Full name</Field.Label>
                                <Input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Test Student"
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>Email</Field.Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="student@example.com"
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>Password</Field.Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Minimum 6 characters"
                                />
                            </Field.Root>
                        </Stack>

                        {error && (
                            <Text color="red.500" fontSize="sm">
                                {error}
                            </Text>
                        )}

                        <Button colorPalette="blue" size="lg" onClick={handleRegister}>
                            Create Account
                        </Button>

                        <Text textAlign="center" color="gray.600">
                            Already registered?{" "}
                            <Link asChild color="blue.600">
                                <RouterLink to="/login">Login</RouterLink>
                            </Link>
                        </Text>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}

export default RegisterPage;