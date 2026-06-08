export interface ConsensusItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
}

export const consensusItems: ConsensusItem[] = [
  {
    id: 'root',
    title: '根本共识',
    subtitle: '正心正念，互相成就，共创共享',
    description:
      '我们坚信，商业的本质是人与人的连接。正心正念是我们一切行为的根基，只有真诚对待每一个合作伙伴，才能建立长久的信任关系，互相成就。',
    icon: 'Heart',
    color: 'from-red-400 to-orange-400'
  },
  {
    id: 'communication',
    title: '沟通共识',
    subtitle: '正向思考，建设性沟通，改过责善',
    description:
      '沟通是解决一切问题的基础。我们倡导正向思考，以建设性的方式表达观点，在指出问题的同时提出改进建议。改过责善，互相督促，共同成长。',
    icon: 'MessageCircle',
    color: 'from-blue-400 to-cyan-400'
  },
  {
    id: 'mindset',
    title: '心性成长',
    subtitle: '正念训练，安住当下，尊道贵德',
    description:
      '商业成功的根本在于心性的成长。通过正念训练，观察心念而不执着，安住于当下，成为更好的自己，才能做出更智慧与向善的商业决策。',
    icon: 'Brain',
    color: 'from-purple-400 to-pink-400'
  },
  {
    id: 'traceability',
    title: '行为留痕',
    subtitle: '坦荡者敢于留痕，可靠看得见',
    description:
      '每一个行为都在塑造你的商业信誉。我们鼓励用户敢于行为留痕，让可靠被看见、被验证、被传播。',
    icon: 'Fingerprint',
    color: 'from-green-400 to-teal-400'
  },
  {
    id: 'partner',
    title: '伙伴优选',
    subtitle: '交往沉淀，成就优质伙伴',
    description:
      '通过平台沉淀的沟通记录，映射出真正值得信赖的商业伙伴，降低合作风险，提高合作效率。',
    icon: 'Users',
    color: 'from-amber-400 to-orange-400'
  },
  {
    id: 'archive',
    title: '平台存档',
    subtitle: '自主记录，授权查询，恶行曝光',
    description:
      '平台为用户提供自主记录、授权查询的功能，同时建立恶行曝光机制，让不诚信的行为无所遁形，共同维护商业环境的清澈。',
    icon: 'Database',
    color: 'from-indigo-400 to-blue-400'
  }
];
