USE smart_placement_portal;

/*
  Safety backfill for older questions created before explanations were added.
  Curated explanations in question-bank-seed.sql are preserved.
  Replace these generic explanations later with subject-specific explanations
  as the question bank grows.
*/
UPDATE questions
SET explanation = CONCAT(
  'Correct option: ', correct_option,
  '. Review the ',
  COALESCE(subtopic, 'core placement'),
  ' concept and compare each option with the definition or method used to solve the question.'
)
WHERE explanation IS NULL OR TRIM(explanation) = '';
