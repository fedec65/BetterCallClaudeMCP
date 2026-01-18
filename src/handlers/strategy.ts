import type { LegalStrategyInput, LegalStrategyOutput, StrategicOption } from '../types/index.js';

/**
 * Generate SWOT analysis based on case description
 */
function generateSwotAnalysis(
  caseDescription: string,
  clientPosition: string,
  domain?: string
): { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } {
  // This is a template-based analysis that provides structure
  // In production, this would be enhanced with AI-powered analysis
  const isPlaintiff = clientPosition === 'plaintiff' || clientPosition === 'appellant';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Analyze case description for key indicators
  const lowerDesc = caseDescription.toLowerCase();

  // Evidence indicators
  if (lowerDesc.includes('document') || lowerDesc.includes('contract') || lowerDesc.includes('written')) {
    strengths.push('Documentary evidence appears available');
  } else {
    weaknesses.push('Case may rely heavily on witness testimony');
  }

  // Clear liability indicators
  if (lowerDesc.includes('breach') || lowerDesc.includes('violation') || lowerDesc.includes('failed')) {
    if (isPlaintiff) {
      strengths.push('Clear factual basis for liability claim');
    } else {
      threats.push('Strong liability allegations to address');
    }
  }

  // Damage indicators
  if (lowerDesc.includes('damage') || lowerDesc.includes('loss') || lowerDesc.includes('schaden')) {
    if (isPlaintiff) {
      strengths.push('Damages appear quantifiable');
    } else {
      opportunities.push('Potential to challenge damage calculations');
    }
  }

  // Limitation period concerns
  if (lowerDesc.includes('year') || lowerDesc.includes('ago') || lowerDesc.includes('2020') || lowerDesc.includes('2019')) {
    threats.push('Review limitation periods (Art. 127-142 OR)');
  }

  // Domain-specific considerations
  if (domain === 'employment') {
    opportunities.push('Consider conciliation proceedings (Art. 197 ZPO)');
    if (isPlaintiff) {
      opportunities.push('Employee protection provisions may apply');
    }
  }

  if (domain === 'commercial' || domain === 'corporate') {
    opportunities.push('Commercial court jurisdiction may be available');
  }

  // General strategic points
  if (isPlaintiff) {
    opportunities.push('Settlement negotiations before formal proceedings');
    threats.push('Burden of proof rests with claimant (Art. 8 ZGB)');
  } else {
    opportunities.push('Challenge jurisdiction or procedural requirements');
    strengths.push('Benefit of doubt in ambiguous situations');
  }

  // Ensure minimum entries
  if (strengths.length === 0) strengths.push('Case merits require detailed factual analysis');
  if (weaknesses.length === 0) weaknesses.push('Additional evidence gathering may be needed');
  if (opportunities.length === 0) opportunities.push('Early case assessment recommended');
  if (threats.length === 0) threats.push('Opponent may raise counterclaims');

  return { strengths, weaknesses, opportunities, threats };
}

/**
 * Generate strategic options based on case analysis
 */
function generateStrategicOptions(
  clientPosition: string,
  _domain?: string,
  constraints?: string[]
): StrategicOption[] {
  const options: StrategicOption[] = [];
  const hasTimeConstraint = constraints?.some(c => c.toLowerCase().includes('time') || c.toLowerCase().includes('urgent'));
  const hasBudgetConstraint = constraints?.some(c => c.toLowerCase().includes('budget') || c.toLowerCase().includes('cost'));

  // Option 1: Full litigation
  options.push({
    name: 'Full Litigation Strategy',
    description: 'Pursue all claims through formal court proceedings with comprehensive discovery and expert testimony',
    pros: [
      'Maximum potential recovery',
      'Creates binding legal precedent',
      'Full discovery rights',
      'Appeals process available',
    ],
    cons: [
      'Highest cost and time investment',
      'Outcome uncertain',
      'Public proceedings',
      'Relationship damage',
    ],
    estimatedSuccessRate: 0.55,
    timeframe: '18-36 months',
    costLevel: 'high',
    risks: [
      'Adverse cost award if unsuccessful',
      'Opponent may have litigation resources',
      'Evidence may not fully support claims',
    ],
  });

  // Option 2: Negotiated settlement
  options.push({
    name: 'Early Settlement Approach',
    description: 'Initiate settlement discussions before or early in litigation, potentially through mediation',
    pros: [
      'Faster resolution',
      'Lower costs',
      'Confidential outcome',
      'Preserved relationships',
      'Certain outcome',
    ],
    cons: [
      'May recover less than full claim',
      'No legal precedent created',
      'Opponent may perceive weakness',
    ],
    estimatedSuccessRate: 0.75,
    timeframe: '3-6 months',
    costLevel: hasBudgetConstraint ? 'low' : 'medium',
    risks: [
      'Settlement may be below true value',
      'Time spent may not lead to agreement',
    ],
  });

  // Option 3: Mediation/ADR
  options.push({
    name: 'Structured Mediation',
    description: 'Formal mediation process with neutral third party, preserving litigation rights if unsuccessful',
    pros: [
      'Professional neutral facilitator',
      'Structured process',
      'Confidential',
      'Preserves litigation option',
      'May be required before court (Art. 197 ZPO)',
    ],
    cons: [
      'Not binding unless agreement reached',
      'Requires opponent cooperation',
      'Mediator fees',
    ],
    estimatedSuccessRate: 0.65,
    timeframe: '2-4 months',
    costLevel: 'low',
    risks: [
      'Opponent may use process to delay',
      'May reveal case strategy',
    ],
  });

  // Option 4: Defensive/waiting strategy (for defendants)
  if (clientPosition === 'defendant' || clientPosition === 'respondent') {
    options.push({
      name: 'Active Defense Strategy',
      description: 'Respond to claims while actively challenging jurisdiction, procedure, and substantive claims',
      pros: [
        'May result in early dismissal',
        'Preserves all defenses',
        'May reveal plaintiff weaknesses',
        'Time can work in favor',
      ],
      cons: [
        'Costs accumulate during defense',
        'Uncertainty persists',
        'May antagonize court if seen as delay tactics',
      ],
      estimatedSuccessRate: 0.5,
      timeframe: '12-24 months',
      costLevel: 'medium',
      risks: [
        'Judgment may include interest from claim date',
        'Plaintiff may improve case over time',
      ],
    });
  }

  // Adjust for constraints
  if (hasTimeConstraint) {
    // Prioritize faster options
    options.sort((a, b) => {
      const aMonths = parseInt(a.timeframe.split('-')[0] || '0', 10);
      const bMonths = parseInt(b.timeframe.split('-')[0] || '0', 10);
      return aMonths - bMonths;
    });
  }

  return options;
}

/**
 * Identify key precedents for the case type
 */
function identifyKeyPrecedents(domain?: string, description?: string): string[] {
  const precedents: string[] = [];

  // Domain-specific leading cases
  if (domain === 'commercial' || domain === 'civil') {
    precedents.push('BGE 145 III 143 (Contractual liability principles)');
    precedents.push('BGE 142 III 239 (Damage calculation methodology)');
  }

  if (domain === 'employment') {
    precedents.push('BGE 146 III 203 (Termination requirements)');
    precedents.push('BGE 143 III 290 (Employment discrimination)');
  }

  if (domain === 'corporate') {
    precedents.push('BGE 144 III 100 (Director liability)');
    precedents.push('BGE 141 III 159 (Shareholder rights)');
  }

  // Check description for specific topics
  const lowerDesc = (description || '').toLowerCase();

  if (lowerDesc.includes('good faith') || lowerDesc.includes('treu und glauben')) {
    precedents.push('BGE 143 III 348 (Good faith in contract performance)');
  }

  if (lowerDesc.includes('negligence') || lowerDesc.includes('fahrlässig')) {
    precedents.push('BGE 141 III 97 (Negligence standard)');
  }

  if (lowerDesc.includes('interpretation') || lowerDesc.includes('auslegung')) {
    precedents.push('BGE 142 III 239 (Contract interpretation principles)');
  }

  // General precedents if none specific
  if (precedents.length === 0) {
    precedents.push('BGE 145 III 143 (General contract principles)');
    precedents.push('BGE 144 III 155 (Burden of proof)');
  }

  return precedents.slice(0, 5); // Limit to top 5
}

/**
 * Handle the legal_strategy tool
 * Provides strategic case analysis and recommendations
 */
export async function handleLegalStrategy(
  input: LegalStrategyInput,
  _requestId: string
): Promise<LegalStrategyOutput> {
  const {
    caseDescription,
    clientPosition,
    jurisdiction,
    canton,
    domain,
    objectives: _objectives,
    constraints,
    lang,
  } = input;

  // Generate SWOT analysis
  const swotAnalysis = generateSwotAnalysis(caseDescription, clientPosition, domain);

  // Generate strategic options
  const strategicOptions = generateStrategicOptions(clientPosition, domain, constraints);

  // Identify key precedents
  const keyPrecedents = identifyKeyPrecedents(domain, caseDescription);

  // Calculate overall success likelihood
  // Based on SWOT balance and position
  const strengthScore = swotAnalysis.strengths.length * 0.15;
  const weaknessScore = swotAnalysis.weaknesses.length * -0.1;
  const opportunityScore = swotAnalysis.opportunities.length * 0.1;
  const threatScore = swotAnalysis.threats.length * -0.1;

  const baseSuccess = 0.5; // Start at 50%
  const overallSuccessLikelihood = Math.max(0.1, Math.min(0.9,
    baseSuccess + strengthScore + weaknessScore + opportunityScore + threatScore
  ));

  // Determine recommended approach
  const recommendedDescription = determineRecommendation(
    overallSuccessLikelihood,
    strategicOptions,
    constraints
  );

  // Procedural considerations
  const proceduralConsiderations = generateProceduralConsiderations(
    jurisdiction,
    canton,
    domain,
    clientPosition
  );

  // Settlement analysis
  const settlementAnalysis = analyzeSettlementPotential(
    overallSuccessLikelihood,
    caseDescription,
    clientPosition
  );

  // Professional disclaimer
  const disclaimer = generateDisclaimer(lang || 'de');

  return {
    caseAssessment: swotAnalysis,
    overallSuccessLikelihood,
    strategicOptions,
    recommendedApproach: recommendedDescription,
    keyPrecedents,
    proceduralConsiderations,
    settlementAnalysis,
    disclaimer,
  };
}

function determineRecommendation(
  successLikelihood: number,
  _options: StrategicOption[],
  constraints?: string[]
): string {
  const hasBudgetConstraint = constraints?.some(c =>
    c.toLowerCase().includes('budget') || c.toLowerCase().includes('cost')
  );

  if (successLikelihood >= 0.7) {
    return 'Strong case merits support full litigation strategy with comprehensive claim presentation. Consider settlement only at favorable terms.';
  } else if (successLikelihood >= 0.5) {
    if (hasBudgetConstraint) {
      return 'Moderate success prospects suggest pursuing structured mediation to reduce costs while preserving litigation option.';
    }
    return 'Balanced risk profile suggests parallel settlement discussions while preparing litigation. Maintain flexibility.';
  } else {
    return 'Risk factors suggest prioritizing early settlement to minimize exposure. Conduct thorough cost-benefit analysis before proceeding to litigation.';
  }
}

function generateProceduralConsiderations(
  _jurisdiction?: string,
  canton?: string,
  domain?: string,
  _clientPosition?: string
): string[] {
  const considerations: string[] = [];

  // General ZPO considerations
  considerations.push('Verify proper jurisdiction and venue (Art. 9-46 ZPO)');
  considerations.push('Consider value-based court assignment (Art. 243 ZPO for simplified procedure)');

  // Conciliation requirement
  considerations.push('Mandatory conciliation proceeding required (Art. 197 ZPO) unless exemption applies');

  // Domain-specific
  if (domain === 'commercial') {
    considerations.push('Commercial court jurisdiction may apply (Art. 6 ZPO) - check value threshold');
  }

  if (domain === 'employment') {
    considerations.push('Simplified procedure applies for claims up to CHF 30,000 (Art. 243 ZPO)');
    considerations.push('No court fees for employment disputes up to CHF 30,000');
  }

  // Canton-specific
  if (canton === 'ZH') {
    considerations.push('Zürich: Handelsgericht for commercial disputes above CHF 30,000');
  } else if (canton === 'GE') {
    considerations.push('Geneva: Tribunal de première instance with specialized chambers');
  }

  // Time limits
  considerations.push('Review all applicable limitation periods (Art. 127-142 OR)');
  considerations.push('Note 30-day deadline for appeal (Art. 311 ZPO)');

  return considerations;
}

function analyzeSettlementPotential(
  successLikelihood: number,
  _caseDescription: string,
  clientPosition: string
): { advisable: boolean; estimatedValue?: string; timing?: string } {
  const isPlaintiff = clientPosition === 'plaintiff' || clientPosition === 'appellant';

  // Settlement is generally more advisable when success is uncertain
  const advisable = successLikelihood < 0.75;

  let estimatedValue: string | undefined;
  let timing: string | undefined;

  if (advisable) {
    if (isPlaintiff) {
      if (successLikelihood >= 0.6) {
        estimatedValue = '60-80% of claimed amount';
        timing = 'After initial discovery phase to demonstrate strength';
      } else {
        estimatedValue = '40-60% of claimed amount';
        timing = 'Early, before significant costs accumulate';
      }
    } else {
      if (successLikelihood >= 0.6) {
        timing = 'Consider after challenging weakest claims';
      } else {
        estimatedValue = 'Consider structured payment terms';
        timing = 'Early settlement may minimize exposure';
      }
    }
  }

  return { advisable, estimatedValue, timing };
}

function generateDisclaimer(lang: string): string {
  const disclaimers: Record<string, string> = {
    de: 'Diese strategische Analyse dient nur zu Informationszwecken und stellt keine Rechtsberatung dar. Eine professionelle anwaltliche Überprüfung ist erforderlich.',
    fr: 'Cette analyse stratégique est fournie à titre informatif uniquement et ne constitue pas un avis juridique. Un examen par un avocat professionnel est requis.',
    it: 'Questa analisi strategica è fornita solo a scopo informativo e non costituisce consulenza legale. È richiesta una revisione professionale da parte di un avvocato.',
    en: 'This strategic analysis is provided for informational purposes only and does not constitute legal advice. Professional lawyer review is required.',
  };

  return disclaimers[lang] || disclaimers['en'] || '';
}
