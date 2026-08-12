import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { MikroORM } from '@mikro-orm/postgresql';
import mikroOrmConfig from '../../../mikro-orm.config';
import { Subject } from '../../modules/Subject/subject.entity';
import { Career } from '../../modules/Career/career.entity';
import { User } from '../../modules/User/user.entity';
import { StudyMaterial, MaterialType } from '../../modules/StudyMaterial/study_material.entity';

interface LegacyItem {
  indice: number | string;
  src: string;
  titulo: string;
  tema?: string;
}

interface LegacyMateria {
  id: string;
  nombre: string;
  cargaHoraria?: number;
  programa?: string;
  observacion?: string;
  videos: LegacyItem[];
  apuntesteoricos: LegacyItem[];
  apuntespracticos: LegacyItem[];
}

function parseArgs(): { careerId: number; userId: number; file?: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value];
    }),
  );

  if (!args.careerId || !args.userId) {
    throw new Error(
      'Uso: pnpm run seed:legacy -- --careerId=<id> --userId=<id admin> [--file=<ruta a informacion.js>]',
    );
  }

  return { careerId: Number(args.careerId), userId: Number(args.userId), file: args.file };
}

function loadLegacyMaterias(filePath: string): LegacyMateria[] {
  const code = fs.readFileSync(filePath, 'utf-8');
  const sandbox: any = { module: { exports: {} }, exports: {}, console };
  vm.createContext(sandbox);
  const script = new vm.Script(`${code}\nmodule.exports = { todasLasMaterias };`, {
    filename: filePath,
  });
  script.runInContext(sandbox);
  return sandbox.module.exports.todasLasMaterias;
}

function extractDriveId(programaUrl?: string): string | null {
  if (!programaUrl) return null;
  const match = programaUrl.match(/\/d\/([\w-]+)\//);
  if (!match) return null;
  const id = match[1];
  if (!id || id.length < 10 || id === 'null' || id === 'undefined') return null;
  return id;
}

async function main() {
  const { careerId, userId, file } = parseArgs();

  const defaultFile = path.resolve(
    __dirname,
    '../../../../../repositorioFrancori/repositorioFrancori/informacion.js',
  );
  const filePath = file ? path.resolve(file) : defaultFile;

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró informacion.js en: ${filePath}`);
  }

  const materias = loadLegacyMaterias(filePath);
  console.log(`Se encontraron ${materias.length} materias en el archivo legacy.`);

  const orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();

  try {
    const career = await em.findOneOrFail(Career, careerId);
    const user = await em.findOneOrFail(User, userId);

    let createdSubjects = 0;
    let createdMaterials = 0;
    let skippedMaterials = 0;

    for (const materia of materias) {
      let subject = await em.findOne(Subject, { name: materia.nombre });

      if (!subject) {
        subject = em.create(Subject, {
          name: materia.nombre,
          description: materia.observacion || undefined,
          code: materia.id,
          hoursPerWeek: materia.cargaHoraria || 0,
        } as any);
        await em.persistAndFlush(subject);
        createdSubjects++;
      }

      await em.populate(career, ['subjects']);
      if (!career.subjects.contains(subject)) {
        career.subjects.add(subject);
        await em.persistAndFlush(career);
      }

      const groups: { items: LegacyItem[]; type: MaterialType }[] = [
        { items: materia.videos || [], type: MaterialType.VIDEO },
        { items: materia.apuntesteoricos || [], type: MaterialType.THEORETICAL },
        { items: materia.apuntespracticos || [], type: MaterialType.PRACTICAL },
      ];

      for (const group of groups) {
        for (const item of group.items) {
          const title = item.titulo || `${materia.nombre} - ${item.indice}`;
          const existing = await em.findOne(StudyMaterial, {
            title,
            subject: subject.id,
            type: group.type,
          });
          if (existing) {
            skippedMaterials++;
            continue;
          }

          const material = em.create(StudyMaterial, {
            title,
            description: item.tema || undefined,
            subject,
            type: group.type,
            resourceUrl: item.src,
            uploadedBy: user,
          } as any);
          await em.persistAndFlush(material);
          createdMaterials++;
        }
      }

      const driveId = extractDriveId(materia.programa);
      if (driveId) {
        const title = 'Programa de la materia';
        const existing = await em.findOne(StudyMaterial, {
          title,
          subject: subject.id,
          type: MaterialType.OTHER,
        });
        if (!existing) {
          const material = em.create(StudyMaterial, {
            title,
            subject,
            type: MaterialType.OTHER,
            resourceUrl: materia.programa!,
            uploadedBy: user,
          } as any);
          await em.persistAndFlush(material);
          createdMaterials++;
        } else {
          skippedMaterials++;
        }
      }

      console.log(`✓ ${materia.nombre}`);
    }

    console.log('\nListo.');
    console.log(`Materias nuevas: ${createdSubjects}`);
    console.log(`Materiales creados: ${createdMaterials}`);
    console.log(`Materiales ya existentes (salteados): ${skippedMaterials}`);
  } finally {
    await orm.close();
  }
}

main().catch((err) => {
  console.error('Error corriendo el seed:', err);
  process.exit(1);
});
