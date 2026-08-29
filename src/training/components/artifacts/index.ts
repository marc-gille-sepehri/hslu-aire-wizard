import type { ComponentType } from 'react'
import type { Artifact } from '../../schema/types'
import Prose from './Prose'
import Bullets from './Bullets'
import Callout from './Callout'
import MCQ from './MCQ'
import LabSelect from './LabSelect'
import Reflect from './Reflect'
import Media from './Media'
import LlmPrompt from './LlmPrompt'
import Bpmn from './Bpmn'
import McpInspector from './McpInspector'
import Ontology from './Ontology'
import DataQuery from './DataQuery'
import ObjectGraph from './ObjectGraph'
import DocConvert from './DocConvert'
import EmbeddingCompare from './EmbeddingCompare'
import AgentTrace from './AgentTrace'
import Orchestration from './Orchestration'

type ArtifactComponent<T extends Artifact = Artifact> = ComponentType<{ artifact: T }>

export const artifactComponents: Record<Artifact['type'], ArtifactComponent<any>> = {
  prose: Prose,
  bullets: Bullets,
  callout: Callout,
  mcq: MCQ,
  lab_select: LabSelect,
  reflect: Reflect,
  media: Media,
  llm_prompt: LlmPrompt,
  bpmn: Bpmn,
  mcp_inspector: McpInspector,
  ontology: Ontology,
  data_query: DataQuery,
  object_graph: ObjectGraph,
  doc_convert: DocConvert,
  embedding_compare: EmbeddingCompare,
  agent_trace: AgentTrace,
  orchestration: Orchestration,
}
