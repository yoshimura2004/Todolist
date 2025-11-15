import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 예시: Todo 테이블이 있다면
  const todos = await prisma.todo.findMany()
  console.log('현재 DB에 있는 Todo 목록:', todos)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
