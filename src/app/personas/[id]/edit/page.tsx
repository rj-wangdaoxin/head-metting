import { notFound, redirect } from 'next/navigation';
import { PersonaForm } from '@/components/personas/PersonaForm';
import { getPersona, listFigures } from '@/lib/queries';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const persona = await getPersona(id, user.id);
  if (!persona) redirect('/personas');

  const figures = await listFigures();

  return (
    <PersonaForm
      mode="edit"
      personaId={persona.id}
      figures={figures.map((f) => ({
        id: f.id,
        name: f.name,
        courtesy: f.courtesy,
        dynasty: f.dynasty,
        category: f.category,
        inkColor: f.inkColor,
      }))}
      initial={{
        figureId: persona.figure.id,
        name: persona.name,
        personalityOverride: persona.personalityOverride ?? '',
        toneStyle: persona.toneStyle ?? '',
        knowledgeFocus: persona.knowledgeFocus,
        stanceShift: persona.stanceShift ?? '',
        extraPrompt: persona.extraPrompt ?? '',
        strictness: persona.strictness,
      }}
    />
  );
}
