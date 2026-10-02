import matter from 'gray-matter';
import { TodoItemSchema, type TodoItem } from '../../src/data/schema';
import { stripWikilinks, todoKey } from './text';

export function parseTodos(raw: string): TodoItem[] {
  const { content } = matter(raw);
  const section = content.match(/## ✅ 待辦[^\n]*\n([\s\S]*?)(?=\n## |$)/);
  if (!section) return [];

  const todos: TodoItem[] = [];
  for (const line of section[1].split('\n')) {
    const m = line.trim().match(/^- \[( |x)\] (.+)$/);
    if (!m) continue;
    const text = stripWikilinks(m[2].trim());
    todos.push(TodoItemSchema.parse({ key: todoKey(text), text, checkedInVault: m[1] === 'x' }));
  }
  return todos;
}