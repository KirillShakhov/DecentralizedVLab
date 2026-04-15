import type { Course } from '../types'

export const demoCourse: Course = {
  id: 'demo-python-intro-v1',
  title: 'Введение в Python',
  description: 'Практический курс для знакомства с платформой: от первой программы до алгоритмов и многофайловых проектов. Все задания запускаются прямо в браузере через WebAssembly — без установки Python.',
  authorId: 'demo',
  authorName: 'Демо-курс',
  isPublic: true,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  labs: [
    {
      id: 'demo-lab-1',
      order: 0,
      title: 'Привет, мир!',
      language: 'python',
      description: `## Первая программа

Добро пожаловать на платформу В-Лаба!

Ваша задача — вывести строку **Hello, World!** с помощью функции \`print()\`.

Попробуйте изменить текст и запустить программу снова — результат сразу появится в терминале справа.

> Кнопка **Run** или **Ctrl+Enter** запускают код.`,
      files: [
        {
          path: 'main.py',
          readOnly: false,
          content: `# Задание: выведите "Hello, World!"
# Нажмите Run или Ctrl+Enter чтобы запустить

print("Hello, World!")
`,
        },
      ],
      testCases: [
        {
          id: 'demo-tc-1-1',
          description: 'Проверка вывода',
          input: '',
          expectedOutput: 'Hello, World!',
          isHidden: false,
        },
      ],
    },

    {
      id: 'demo-lab-2',
      order: 1,
      title: 'Ввод и вывод',
      language: 'python',
      description: `## Чтение данных от пользователя

Функция \`input()\` читает строку из стандартного ввода (stdin).

**Задание:** считайте имя пользователя и выведите приветствие в формате:
\`\`\`
Привет, <имя>!
\`\`\`

**Пример:**
- Ввод: \`Алиса\`
- Вывод: \`Привет, Алиса!\``,
      files: [
        {
          path: 'main.py',
          readOnly: false,
          content: `# Считайте имя и поприветствуйте пользователя
name = input()
print(f"Привет, {name}!")
`,
        },
      ],
      testCases: [
        {
          id: 'demo-tc-2-1',
          description: 'Приветствие Алисы',
          input: 'Алиса',
          expectedOutput: 'Привет, Алиса!',
          isHidden: false,
        },
        {
          id: 'demo-tc-2-2',
          description: 'Приветствие Боба',
          input: 'Боб',
          expectedOutput: 'Привет, Боб!',
          isHidden: false,
        },
        {
          id: 'demo-tc-2-3',
          description: 'Скрытый тест',
          input: 'ИТМО',
          expectedOutput: 'Привет, ИТМО!',
          isHidden: true,
        },
      ],
    },

    {
      id: 'demo-lab-3',
      order: 2,
      title: 'FizzBuzz',
      language: 'python',
      description: `## Классическая задача FizzBuzz

Считайте число **N** и выведите числа от 1 до N, заменяя:
- кратные **3** → \`Fizz\`
- кратные **5** → \`Buzz\`
- кратные **15** → \`FizzBuzz\`

**Пример (N=5):**
\`\`\`
1
2
Fizz
4
Buzz
\`\`\``,
      files: [
        {
          path: 'main.py',
          readOnly: false,
          content: `n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`,
        },
      ],
      testCases: [
        {
          id: 'demo-tc-3-1',
          description: 'N=5',
          input: '5',
          expectedOutput: '1\n2\nFizz\n4\nBuzz',
          isHidden: false,
        },
        {
          id: 'demo-tc-3-2',
          description: 'N=15 — полный цикл',
          input: '15',
          expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
          isHidden: false,
        },
        {
          id: 'demo-tc-3-3',
          description: 'N=1 (скрытый)',
          input: '1',
          expectedOutput: '1',
          isHidden: true,
        },
      ],
    },

    {
      id: 'demo-lab-4',
      order: 3,
      title: 'Многофайловый проект: математика',
      language: 'python',
      description: `## Работа с несколькими файлами

В проекте два файла:
- \`utils.py\` — **библиотека** с готовыми функциями (только чтение)
- \`main.py\` — **ваш код**

**Задание:** используя функции из \`utils.py\`, считайте число **N** и выведите:
1. Факториал N
2. Является ли N простым числом (\`True\` / \`False\`)

**Пример (N=5):**
\`\`\`
120
True
\`\`\``,
      files: [
        {
          path: 'utils.py',
          readOnly: true,
          content: `def factorial(n: int) -> int:
    """Вычисляет факториал числа n."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)


def is_prime(n: int) -> bool:
    """Проверяет, является ли n простым числом."""
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True
`,
        },
        {
          path: 'main.py',
          readOnly: false,
          content: `from utils import factorial, is_prime

n = int(input())
print(factorial(n))
print(is_prime(n))
`,
        },
      ],
      testCases: [
        {
          id: 'demo-tc-4-1',
          description: 'N=5: факториал и простое',
          input: '5',
          expectedOutput: '120\nTrue',
          isHidden: false,
        },
        {
          id: 'demo-tc-4-2',
          description: 'N=4: составное',
          input: '4',
          expectedOutput: '24\nFalse',
          isHidden: false,
        },
        {
          id: 'demo-tc-4-3',
          description: 'N=10 (скрытый)',
          input: '10',
          expectedOutput: '3628800\nFalse',
          isHidden: true,
        },
      ],
    },

    {
      id: 'demo-lab-5',
      order: 4,
      title: 'Сортировка пузырьком',
      language: 'python',
      description: `## Алгоритм сортировки

Реализуйте **сортировку пузырьком** (bubble sort).

**Ввод:**
- Первая строка: число N (количество элементов)
- Вторая строка: N чисел через пробел

**Вывод:** отсортированные числа через пробел

**Пример:**
\`\`\`
Ввод:    5
         3 1 4 1 5
Вывод:   1 1 3 4 5
\`\`\`

> Попробуйте улучшить алгоритм: добавьте флаг ранней остановки если за проход не было обменов.`,
      files: [
        {
          path: 'main.py',
          readOnly: false,
          content: `n = int(input())
arr = list(map(int, input().split()))

# Реализация bubble sort
for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

print(*arr)
`,
        },
      ],
      testCases: [
        {
          id: 'demo-tc-5-1',
          description: '5 элементов',
          input: '5\n3 1 4 1 5',
          expectedOutput: '1 1 3 4 5',
          isHidden: false,
        },
        {
          id: 'demo-tc-5-2',
          description: 'Уже отсортированный',
          input: '4\n1 2 3 4',
          expectedOutput: '1 2 3 4',
          isHidden: false,
        },
        {
          id: 'demo-tc-5-3',
          description: 'Один элемент',
          input: '1\n42',
          expectedOutput: '42',
          isHidden: false,
        },
        {
          id: 'demo-tc-5-4',
          description: 'Обратный порядок (скрытый)',
          input: '6\n9 7 5 3 1 0',
          expectedOutput: '0 1 3 5 7 9',
          isHidden: true,
        },
      ],
    },
  ],
}
