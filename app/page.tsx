import type { Metadata } from "next";
import CalendarApp from "./components/CalendarApp";

export const metadata: Metadata = {
  title: "Lumina — seu tempo, com clareza",
  description: "Calendário e gerenciador de tarefas para estudos, provas e grandes objetivos.",
};

export default function Home() {
  return <CalendarApp />;
}
