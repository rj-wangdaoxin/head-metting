import { PersonaForm } from '@/components/personas/PersonaForm';
import { getFigureBySlug, listFigures } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function NewPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ figure?: string }>;
}) {
  const { figure: figureSlug } = await searchParams;
  const figures = await listFigures();
  const preset = figureSlug ? await getFigureBySlug(figureSlug) : null;

  return (
    <PersonaForm
      mode="create"
      figures={figures.map((f) => ({
        id: f.id,
        name: f.name,
        courtesy: f.courtesy,
        dynasty: f.dynasty,
        category: f.category,
        inkColor: f.inkColor,
      }))}
      initial={{
        figureId: preset?.id ?? '',
        name: preset ? `${preset.name}·分身` : '',
        personalityOverride: '',
        toneStyle: '',
        knowledgeFocus: preset ? preset.expertise.slice(0, 3) : [],
        stanceShift: '',
        extraPrompt: '',
        strictness: 3,
      }}
    />
  );
}
