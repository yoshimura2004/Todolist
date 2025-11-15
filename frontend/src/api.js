export async function fetchHello() {
  const res = await fetch('/api/hello');
  if (!res.ok) throw new Error('Failed to fetch /api/hello');
  return res.json();
}

export async function createTodo(title) {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to POST /api/todos');
  return res.json();
}
