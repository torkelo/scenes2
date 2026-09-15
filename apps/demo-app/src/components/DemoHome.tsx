import { Stack, TextLink } from '@grafana/ui';
import { ROUTES } from '../constants';
import { prefixRoute } from '../utils/utils.routing';
import { PageWrapper } from './PageWrapper';

interface DemoScenario {
  route: ROUTES;
  label: string;
}

const scenarios: DemoScenario[] = [
  { route: ROUTES.PanelGridLayoutDemo, label: 'Panel grid layout demo' },
  { route: ROUTES.VariablesDemo, label: 'Variables demo' },
];

export function DemoHome() {
  return (
    <PageWrapper>
      <Stack direction="column" gap={2}>
        {scenarios.map((scenario) => (
          <TextLink key={scenario.route} href={prefixRoute(scenario.route)}>
            {scenario.label}
          </TextLink>
        ))}
      </Stack>
    </PageWrapper>
  );
}
