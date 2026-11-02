USE smart_placement_portal;

/* Run the complete question-bank-seed.sql file first.
   This verification query must show every topic with EASY, MEDIUM and HARD. */
SELECT
  topic_id,
  difficulty,
  COUNT(*) AS total_questions,
  SUM(explanation IS NOT NULL AND TRIM(explanation) <> '') AS explained_questions
FROM questions
GROUP BY topic_id, difficulty
ORDER BY topic_id, FIELD(difficulty, 'EASY', 'MEDIUM', 'HARD');

/* Repair missing explanations for any older rows. */
UPDATE questions
SET explanation = CONCAT(
  'Correct option: ', correct_option,
  '. Review the ', COALESCE(subtopic, 'core placement'),
  ' concept and compare all options before selecting the answer.'
)
WHERE explanation IS NULL OR TRIM(explanation) = '';

/* Show topics that are still missing a difficulty level. */
SELECT topic_id, difficulty
FROM (
  SELECT t.id AS topic_id, d.difficulty
  FROM topics t
  CROSS JOIN (
    SELECT 'EASY' AS difficulty
    UNION ALL SELECT 'MEDIUM'
    UNION ALL SELECT 'HARD'
  ) d
) expected
WHERE NOT EXISTS (
  SELECT 1
  FROM questions q
  WHERE q.topic_id = expected.topic_id
    AND q.difficulty = expected.difficulty
)
ORDER BY topic_id, difficulty;
