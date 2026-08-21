const fs = require('fs');
const path = require('path');

// Configuration for architectural checks against feature-suite duplication
const REQUIRED_DOCUMENTATION_SECTIONS = [
  'Existing shared abstractions',
  'Existing persistence mechanism',
  'Existing operation state machine',
  'Existing authorization boundary',
  'Existing error model',
  'Existing telemetry/audit mechanism'
];

function validatePullRequestTemplate(templatePath) {
  if (!fs.existsSync(templatePath)) {
    console.warn('⚠️ PR template not found, skipping architecture check.');
    return true;
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  const missingSections = REQUIRED_DOCUMENTATION_SECTIONS.filter(
    (section) => !content.includes(section)
  );

  if (missingSections.length > 0) {
    console.error('❌ Architecture check failed: Missing required architecture review sections in template:');
    missingSections.forEach((sec) => console.error(`   - ${sec}`));
    return false;
  }

  console.log('✅ Architecture check passed: All required duplication prevention checks are documented.');
  return true;
}

if (require.main === module) {
  const templatePath = path.resolve(process.cwd(), '.github/pull_request_template.md');
  const isValid = validatePullRequestTemplate(templatePath);
  process.exit(isValid ? 0 : 1);
}

module.exports = { validatePullRequestTemplate };
