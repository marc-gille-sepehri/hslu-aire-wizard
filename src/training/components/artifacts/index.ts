import type { ComponentType } from 'react'
import type { Artifact } from '../../schema/types'
import Prose from './Prose'
import Bullets from './Bullets'
import Callout from './Callout'
import MCQ from './MCQ'
import LabSelect from './LabSelect'
import Reflect from './Reflect'
import Media from './Media'

type ArtifactComponent<T extends Artifact = Artifact> = ComponentType<{ artifact: T }>

export const artifactComponents: Record<Artifact['type'], ArtifactComponent<any>> = {
  prose: Prose,
  bullets: Bullets,
  callout: Callout,
  mcq: MCQ,
  lab_select: LabSelect,
  reflect: Reflect,
  media: Media,
}
