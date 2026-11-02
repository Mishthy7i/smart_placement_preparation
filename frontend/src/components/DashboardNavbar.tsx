import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, BookOpenCheck, Bot, ClipboardCheck, Code2, FileText, GitBranch, LayoutDashboard, Lightbulb, LogOut, Menu, Sparkles, X } from "lucide-react";
import { Box, Button, Container, Flex, Heading, Stack, Text } from "@chakra-ui/react";

const items = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Practice", icon: BookOpenCheck, path: "/dashboard#topics" },
    { label: "Performance", icon: BarChart3, path: "/performance" },
    { label: "Mock Tests", icon: ClipboardCheck, path: "/tests" },
    { label: "Resume Analyzer", icon: FileText, path: "/resume" },
    { label: "Coding Profiles", icon: Code2, path: "/coding-profiles" },
    { label: "Placement Coach", icon: Bot, path: "/coach" },
    { label: "Recommendations", icon: Lightbulb, path: "/recommendations" },
    { label: "Projects", icon: GitBranch, path: "/github-projects" },
];

export default function DashboardNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const user = JSON.parse(localStorage.getItem("user") || "null");

    const isActive = (path: string) => {
        const cleanPath = path.split("#")[0];
        return location.pathname === cleanPath && (path !== "/dashboard#topics" || Boolean(location.hash));
    };

    const go = (path: string) => {
        setOpen(false);
        if (path === "/dashboard#topics" && location.pathname === "/dashboard") {
            document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" });
        } else navigate(path);
    };

    const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); };

    return <Box position="sticky" top="0" zIndex="20" bg="rgba(255,255,255,.94)" backdropFilter="blur(18px)" borderBottomWidth="1px" borderColor="gray.200">
        <Container maxW="7xl">
            <Flex minH="72px" align="center" justify="space-between" gap={6}>
                <Flex align="center" gap={3} cursor="pointer" flexShrink={0} onClick={() => navigate("/dashboard")}>
                    <Flex w="42px" h="42px" rounded="14px" bg="linear-gradient(135deg,#3155d9,#7657e8)" color="white" align="center" justify="center"><Sparkles size={20} /></Flex>
                    <Box><Heading size="md" letterSpacing="-.04em">SmartPrep</Heading><Text fontSize="xs" color="gray.500">Placement preparation portal</Text></Box>
                </Flex>

                <Flex display={{ base: "none", lg: "flex" }} align="center" gap={2}>
                    <Flex w="36px" h="36px" rounded="full" bg="blue.100" color="blue.700" align="center" justify="center" fontWeight="bold">{user?.name?.charAt(0)?.toUpperCase() || "S"}</Flex>
                    <Box mr={2}><Text fontWeight="700" fontSize="sm">{user?.name || "Student"}</Text><Text color="gray.500" fontSize="xs">Student account</Text></Box>
                    <Button size="sm" variant="outline" colorPalette="red" onClick={logout}><LogOut size={15} />Logout</Button>
                </Flex>
                <Button display={{ base: "flex", lg: "none" }} variant="ghost" onClick={() => setOpen(!open)} aria-label="Open navigation">{open ? <X /> : <Menu />}</Button>
            </Flex>

            <Flex display={{ base: "none", lg: "flex" }} borderTopWidth="1px" borderColor="gray.100" minH="58px" align="center" justify="center" gap={{ lg: 1, xl: 2 }}>
                {items.map((item) => <Button key={item.label} size="sm" px={{ lg: 2, xl: 3 }} variant={isActive(item.path) ? "subtle" : "ghost"} colorPalette="blue" onClick={() => go(item.path)} whiteSpace="nowrap"><item.icon size={15} />{item.label}</Button>)}
            </Flex>

            {open && <Stack display={{ base: "flex", lg: "none" }} gap={2} py={4} borderTopWidth="1px" borderColor="gray.100">
                {items.map((item) => <Button key={item.label} justifyContent="flex-start" variant={isActive(item.path) ? "subtle" : "ghost"} colorPalette="blue" onClick={() => go(item.path)}><item.icon size={16} />{item.label}</Button>)}
                <Button justifyContent="flex-start" variant="outline" colorPalette="red" onClick={logout}><LogOut size={16} />Logout</Button>
            </Stack>}
        </Container>
    </Box>;
}
