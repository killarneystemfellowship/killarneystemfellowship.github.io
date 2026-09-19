/* Scope workshop content, aligned with the five-tab KSF lesson plan.
 * Identifiers are persisted in student responses; keep them stable.
 * This file is shared by the student app, organizer dashboard, and tests.
 */
(function () {
  'use strict';
  const choice = (id, label, detail) => ({ id, label, detail: detail || '' });
  const reflection = (id, question) => ({ id, question });
  const step = (verb, title, instruction, why, note) => ({ verb, title, instruction, why, note });
  const field = (key, label, options = {}) => ({ key, label, type: 'number', min: 0, max: 10000, step: 'any', ...options });
  const workshops = {
    'dna-discovery-lab': {
      slug: 'dna-discovery-lab', title: 'DNA Discovery Lab', demoCode: 'DNA-DEMO', badgeTitle: 'DNA Explorer',
      grades: 'Grades 3–5', duration: '45–50 minutes', introLabel: 'Meet DNA', confidenceTopic: 'what DNA is',
      heroLabel: 'From strawberry to strand', heroPath: ['Predict', 'Extract', 'Explain'],
      welcome: 'Your digital lab notebook for a real strawberry DNA extraction. Make a prediction, follow your presenter, record what you see, and explain what happened.',
      materials: 'Strawberries, ziplock bags, dish soap, salt, water, coffee filters, cups, cold rubbing alcohol, wooden sticks, spoons, and a tablet or device.',
      introTitle: 'A tiny instruction library inside living things.',
      introSummary: 'Zoom in from a strawberry to the DNA inside its cells. Learn how scientists extract, study, and use it.',
      introFlow: [
        ['Strawberry', 'A strawberry is made of many tiny cells.'],
        ['Cell', 'Most strawberry DNA is stored in each cell’s nucleus.'],
        ['DNA', 'DNA carries instructions that help living things grow, work, and reproduce.']
      ],
      concepts: [
        ['What is DNA?', 'DNA stands for deoxyribonucleic acid. It is a long molecule that stores biological instructions, a little like a recipe book for cells.'],
        ['A twisted ladder', 'DNA’s shape is called a double helix. Its rungs are pairs of bases: A pairs with T, and C pairs with G. Their order helps store instructions.'],
        ['Where is it found?', 'Plants, animals, fungi, and bacteria have DNA. Strawberries have DNA, and so do you. The strands we see today contain many DNA molecules clumped together.']
      ],
      usesTitle: 'How scientists use DNA', uses: [
        ['Personalized medicine', 'Understanding why treatments affect people differently', 'Researchers study DNA to understand inherited conditions and how genetic differences can help guide some treatments.'],
        ['CRISPR-Cas9', 'A tool for changing a chosen part of DNA', 'A guide molecule helps the Cas9 protein find a matching DNA sequence. Cas9 can cut there; the cell’s repair process can change the sequence. Scientists study its benefits, limits, and ethical questions.'],
        ['Forensic science', 'Comparing biological evidence', 'Specialists compare DNA samples as one part of a careful investigation. Evidence needs to be collected and interpreted responsibly.']
      ],
      predictionQuestion: 'What do you think extracted strawberry DNA will look like?',
      predictions: [choice('clear-liquid', 'Clear liquid', 'Transparent with no solid pieces'), choice('white-stringy-material', 'White stringy material', 'Cloudy strands or clumps'), choice('small-crystals', 'Small crystals', 'Hard grains that sink'), choice('nothing-visible', 'Nothing visible', 'Too small to see without a microscope')],
      correctPrediction: 'white-stringy-material', correctAnswer: 'white-stringy-material',
      guideTitle: 'Five moves from fruit to visible DNA.',
      safety: 'Follow your presenter’s instructions. Do not taste any materials. Keep extraction solution and alcohol away from your eyes and mouth; alcohol must stay away from heat and flames.',
      steps: [
        step('Mash', 'Mash the strawberries.', 'Seal the strawberries in the bag and mash until there are very few large pieces left.', 'Mashing breaks up the fruit and helps break cells open so we can reach the DNA.', 'How did the fruit change?'),
        step('Release', 'Add the extraction solution.', 'Add the soap, salt, and water solution your presenter gives you. Reseal the bag and mix gently.', 'Soap helps break cell and nucleus membranes. Salt helps released DNA gather together.', 'How did the mixture look or feel?'),
        step('Separate', 'Filter the mixture.', 'Pour carefully through a coffee filter and collect the liquid in a cup below.', 'The filter holds back seeds, pulp, and large cell pieces while liquid containing DNA passes through.', 'What stayed in the filter?'),
        step('Reveal', 'Add cold alcohol.', 'With your presenter, tilt the cup and slowly add cold alcohol to form a layer. Do not stir.', 'DNA does not dissolve well in cold alcohol, so many molecules clump into material we can see.', 'What happened where the layers met?'),
        step('Observe', 'Collect and examine the strands.', 'Look at the alcohol layer and its boundary. Use a wooden stick to gently lift any white, stringy material.', 'A visible clump contains many DNA molecules; a single DNA molecule is far too small to see with your eyes.', 'Where did strands appear? What did they look like?')
      ],
      observationQuestion: 'Did you see DNA?', observationHint: 'Where did it appear? What colour, shape, or texture did it have?',
      observationTags: [choice('white', 'White'), choice('cloudy', 'Cloudy'), choice('stringy', 'Stringy'), choice('clumpy', 'Clumpy'), choice('web-like', 'Web-like'), choice('no-visible-change', 'No visible change')],
      postCheckQuestion: 'What was the white, stringy material in the alcohol layer?',
      postCheckOptions: [choice('white-stringy-material', 'Many strawberry DNA molecules clumped together'), choice('seeds', 'Tiny strawberry seeds'), choice('soap', 'Soap bubbles only'), choice('sugar', 'Sugar crystals')],
      correctExplanation: 'The white, stringy material contains many strawberry DNA molecules clumped together in the alcohol.',
      successLabel: 'Visible DNA', successDetail: 'groups reported seeing DNA', predictionMetric: 'predicted white stringy material', conceptMetric: 'identified the extracted DNA',
      reflections: [reflection('dna', 'What is DNA and where is it found?'), reflection('mash', 'Why did we mash the strawberries?'), reflection('strands', 'What did the white stringy substance represent?'), reflection('scientists', 'Why do scientists study DNA?')],
      measurements: { title: '', description: '', fields: [] }
    },
    'yeast-balloon-lab': {
      slug: 'yeast-balloon-lab', title: 'Yeast Balloon Lab', demoCode: 'YEAST-DEMO', badgeTitle: 'Microbe Explorer',
      grades: 'Grades 6–7', duration: '45–50 minutes', introLabel: 'Meet microorganisms', confidenceTopic: 'how yeast uses sugar and releases gas',
      heroLabel: 'Small cells, visible evidence', heroPath: ['Predict', 'Compare', 'Explain'],
      welcome: 'Discover the life processes of tiny yeast cells. Compare a fed bottle with a control, track balloon inflation, and explain where the gas came from.',
      materials: 'Two empty water bottles, two balloons, active dry yeast, sugar, warm water, measuring spoons, permanent markers, a timer, a tape measure or string and ruler, and a device.',
      introTitle: 'Tiny living cells. A balloon-sized clue.', introSummary: 'Yeast is a microscopic fungus. Its life processes can leave evidence big enough for us to measure.',
      introFlow: [['Yeast', 'A microscopic fungus made of living cells.'], ['Sugar', 'A source of energy for the cells.'], ['Carbon dioxide', 'A gas that can collect inside a balloon.']],
      concepts: [
        ['What is a microorganism?', 'Microorganisms are organisms too small to see clearly without magnification. Examples include bacteria, archaea, microscopic fungi such as yeast, and some algae. Viruses are also microscopic, but are not living cells and need host cells to reproduce.'],
        ['Living processes', 'Yeast cells use nutrients for energy, grow, and reproduce. With limited oxygen, yeast can ferment sugar and release carbon dioxide. Respiration and fermentation are different ways cells obtain usable energy.'],
        ['Why use a control?', 'Our control has yeast and warm water but no added sugar. Keep the bottle, balloon, water, yeast, temperature, and timing as similar as possible so added sugar is the main difference.']
      ],
      usesTitle: 'Microorganisms at work', uses: [
        ['Bread and beverages', 'Fermentation changes food', 'Yeast releases carbon dioxide that helps bread dough rise. It is also used in making some beverages. Different microbes and conditions produce different foods.'],
        ['Helpful bacteria', 'Food, digestion, and ecosystems', 'Some bacteria ferment foods such as yogurt. Many microbes in the gut help break down food. A probiotic contains live microorganisms studied for a particular health benefit; not every microbe has the same effect.'],
        ['Careful comparison', 'Evidence matters more than a perfect balloon', 'A balloon may inflate slowly or not at all because of temperature, inactive yeast, or leaks. Record what actually happened and discuss possible explanations.']
      ],
      predictionQuestion: 'Which balloon do you predict will inflate more over 20 minutes?',
      predictions: [choice('fed-larger', 'The fed bottle', 'Yeast, sugar, and warm water'), choice('same-size', 'Both equally', 'A similar change in both balloons'), choice('control-larger', 'The control bottle', 'Yeast and warm water, without added sugar'), choice('no-inflation', 'Neither balloon', 'No measurable inflation')],
      correctPrediction: 'fed-larger', correctAnswer: 'co2', guideTitle: 'Two bottles. One fair comparison.',
      safety: 'Use warm water at the temperature your presenter provides. Do not drink the mixtures or put balloons in your mouth. Let your presenter handle any material you cannot safely use.',
      steps: [
        step('Label', 'Prepare the fed bottle and control.', 'Label two matching bottles “fed” and “control.” Gather equal amounts of yeast and warm water, plus sugar for the fed bottle only.', 'A control helps show what changes when sugar is added.', 'Which conditions will you keep the same?'),
        step('Mix', 'Add the ingredients.', 'Follow your presenter’s amounts: put yeast and warm water in both bottles, then add sugar only to the fed bottle. Swirl both in the same way.', 'Yeast can use added sugar for energy. The control makes the comparison meaningful.', 'Record the amounts and water temperature if known.'),
        step('Seal', 'Attach the balloons and start timing.', 'Stretch a balloon over each bottle opening. Check that each is secure. Record the starting balloon size at 0 minutes.', 'An airtight fit helps collect released gas. Starting measurements give us a baseline.', 'Did either bottle or balloon leak?'),
        step('Measure', 'Track both balloons for 15–20 minutes.', 'At 5, 10, 15, and, if time allows, 20 minutes, record the circumference around each balloon’s widest part in centimetres. Use the same method each time.', 'Measurements over time show how fast gas collects. Zero is a measurement; leave a field blank if you did not measure it.', 'Note foam, bubbles, or a change in balloon size.'),
        step('Compare', 'Compare the fed bottle with the control.', 'Look at both sets of measurements. Describe the difference and anything that may have affected the comparison.', 'Evidence supports an explanation even when the result is unexpected. Inflation alone does not tell us every detail about the cells.', 'Which bottle changed more? What evidence supports that?')
      ],
      observationQuestion: 'Did the fed balloon inflate more than the control?', observationHint: 'Compare both balloons using your measurements. Include the elapsed time and any foam, bubbles, or leaks.',
      observationTags: [choice('fed-inflated', 'Fed balloon inflated'), choice('control-inflated', 'Control balloon inflated'), choice('foam', 'Foam'), choice('bubbles', 'Bubbles'), choice('no-change', 'No change')],
      postCheckQuestion: 'What gas can yeast release as it breaks down sugar, inflating the balloon?',
      postCheckOptions: [choice('co2', 'Carbon dioxide'), choice('oxygen', 'Oxygen from photosynthesis'), choice('helium', 'Helium'), choice('sugar-gas', 'Sugar turning directly into gas')],
      correctExplanation: 'Yeast can release carbon dioxide as it breaks down sugar. This gas collects in the balloon; the control helps us compare the effect of adding sugar.',
      successLabel: 'Fed balloon larger', successDetail: 'groups reported more inflation with sugar', predictionMetric: 'predicted more inflation in the fed bottle', conceptMetric: 'identified carbon dioxide from yeast',
      reflections: [reflection('living', 'What are microorganisms, and what evidence shows yeast is alive?'), reflection('control', 'Why might the fed balloon inflate more than the control? How do your results compare?'), reflection('gas', 'What gas caused the balloon to inflate, and where did it come from?'), reflection('foods', 'How are microorganisms used to create different foods and beverages?')],
      measurements: { title: 'Balloon measurements', description: 'Record balloon circumference in centimetres at each time. Measure the same way for both bottles. Leave any measurement you did not take blank.', columns: ['Time', 'Fed bottle (cm)', 'Control (cm)'], rows: [0, 5, 10, 15, 20].map((minute) => ({ label: `${minute} minutes`, keys: [`fed_${minute}_cm`, `control_${minute}_cm`] })), fields: [0, 5, 10, 15, 20].flatMap((minute) => [field(`fed_${minute}_cm`, `Fed balloon at ${minute} minutes (cm)`, { max: 300 }), field(`control_${minute}_cm`, `Control balloon at ${minute} minutes (cm)`, { max: 300 })]) }
    },
    'human-engine-lab': {
      slug: 'human-engine-lab', title: 'The Human Engine', demoCode: 'HEART-DEMO', badgeTitle: 'Heart Explorer',
      grades: 'Grades 6–7', duration: '45–50 minutes', introLabel: 'Meet the circulatory system', confidenceTopic: 'how activity changes heart rate',
      heroLabel: 'Listen. Move. Measure.', heroPath: ['Listen', 'Measure', 'Compare'],
      welcome: 'Build a simple stethoscope, listen to a heartbeat, and compare heart rate before and after a short activity. Connect your measurements to the body’s need for oxygen.',
      materials: 'Stopwatches or phone timers, recording sheets, funnels, plastic balloons, aquarium tubing, a Y connector, scissors used with presenter supervision, and a device.',
      introTitle: 'A pump that responds to your body.', introSummary: 'Your heart moves blood around your body. Listen carefully and investigate how its rate responds to activity.',
      introFlow: [['Heart', 'A muscular pump pushes blood around the body.'], ['Blood vessels', 'Arteries carry blood away from the heart; veins bring it back.'], ['Body cells', 'Blood delivers oxygen and nutrients to working cells.']],
      concepts: [
        ['What is heart rate?', 'Heart rate is the number of heartbeats per minute, written as bpm. One complete “lub-dub” is one heartbeat, not two.'],
        ['What makes the sound?', 'The familiar heart sounds are linked to heart valves closing. Valves help keep blood moving in one direction. A homemade stethoscope may make these sounds easier to hear.'],
        ['Why does it change?', 'Working muscles need more oxygen and nutrients. During activity, heart rate usually rises so blood can deliver them faster. Rate usually falls again during recovery.']
      ],
      usesTitle: 'Heart science in everyday life', uses: [
        ['Medical listening', 'A stethoscope helps clinicians examine the body', 'Clinicians listen to the heart’s sounds and rhythm as one part of an examination. Our classroom tool is a model for learning, not a way to diagnose health.'],
        ['Wearable sensors', 'Following heart rate during daily life', 'Watches and other wearables can estimate heart rate. Movement, fit, and the measurement method can affect the reading.'],
        ['Sports science', 'Studying exercise and recovery', 'Scientists study how the heart and lungs deliver oxygen during activity, including training for demanding sports. Repeated, consistent measurements are useful evidence.']
      ],
      predictionQuestion: 'How do you predict heart rate will change just after the activity?',
      predictions: [choice('faster', 'It will be faster', 'More beats per minute than at rest'), choice('slower', 'It will be slower', 'Fewer beats per minute than at rest'), choice('same', 'It will stay the same', 'No change from the resting measurement'), choice('stops', 'It will briefly stop', 'No heartbeat after movement')],
      correctPrediction: 'faster', correctAnswer: 'oxygen-demand', guideTitle: 'Listen, move, and compare.',
      safety: 'Follow your presenter and choose a comfortable level of movement, including a seated version or an observer role. Stop if you feel unwell. Do not share mouthpieces or put tubing into the ear canal; use scissors only with supervision.',
      steps: [
        step('Build', 'Build a simple stethoscope.', 'With your presenter, stretch a balloon membrane over a funnel and connect the funnel to tubing. Use the Y connector if your design needs it.', 'The funnel and tubing help carry sound from the chest toward the listener.', 'Which parts help collect and carry sound?'),
        step('Listen', 'Measure a resting heartbeat.', 'Sit quietly, then listen with a willing partner. Count complete “lub-dub” beats for 30 seconds and multiply by 2 to get bpm. If the sound is unclear, ask your presenter for a pulse-counting method.', 'A consistent counting interval makes the measurements easier to compare. Record one heartbeat for each complete lub-dub.', 'Was the sound clear? How did you count?'),
        step('Move', 'Try a short activity.', 'Join the presenter’s short movement challenge at a comfortable level. Keep your timer ready to measure as soon as the activity ends.', 'Muscles use more oxygen during movement, and the circulatory system responds.', 'What activity did you try, and for how long?'),
        step('Measure', 'Measure immediately after activity.', 'Use the same method: count complete beats for 30 seconds, then multiply by 2. Record the post-activity bpm and compare the speed and sound with rest.', 'Heart rate begins changing during recovery, so the delay before measuring matters.', 'How soon after the activity did counting begin?'),
        step('Recover', 'Measure after two minutes of rest.', 'Rest comfortably for two minutes, measure again in the same way, and record the recovery bpm. Compare all three readings.', 'A recovery measurement helps show how the body responds when demand decreases.', 'Did the rate move toward the resting value?')
      ],
      observationQuestion: 'Was the heart rate higher immediately after activity than at rest?', observationHint: 'Compare rest, post-activity, and recovery readings in bpm. Describe the counting method and any difficulty hearing or counting beats.',
      observationTags: [choice('faster', 'Faster after activity'), choice('slower', 'Slower after activity'), choice('lub-dub', 'Heard lub-dub'), choice('recovery', 'Slowed during recovery'), choice('no-change', 'No clear change')],
      postCheckQuestion: 'Why does heart rate usually rise during physical activity?',
      postCheckOptions: [choice('oxygen-demand', 'Working muscles need more oxygen, so the heart delivers blood faster'), choice('air-pump', 'The heart pumps air straight into the muscles'), choice('stops-blood', 'Blood stops moving during exercise'), choice('sound-only', 'The stethoscope makes the heart speed up')],
      correctExplanation: 'Working muscles need more oxygen. A faster heart rate helps deliver more blood, carrying oxygen and nutrients to those muscles.',
      successLabel: 'Rate increased', successDetail: 'groups reported a higher rate after activity', predictionMetric: 'predicted a higher rate after activity', conceptMetric: 'connected heart rate to oxygen demand',
      reflections: [reflection('sound', 'What did the “lub-dub” sound represent, and what part of the heart makes it?'), reflection('activity', 'How did your heart rate change after activity compared with rest?'), reflection('oxygen', 'Why do working muscles need the heart to deliver more oxygen during activity?'), reflection('reliability', 'How could you make your heart-rate measurements more reliable?')],
      measurements: { title: 'Heart-rate measurements', description: 'Count complete beats for 30 seconds and multiply by 2. Record bpm, not the 30-second count. Use the same method for each reading. Leave unmeasured readings blank.', fields: [field('rest_bpm', 'At rest (bpm)', { max: 300, step: 1 }), field('active_bpm', 'Immediately after activity (bpm)', { max: 300, step: 1 }), field('recovery_bpm', 'After two minutes of recovery (bpm)', { max: 300, step: 1 })] }
    },
    'bubbling-leaves-lab': {
      slug: 'bubbling-leaves-lab', title: 'Bubbling Leaves Lab', demoCode: 'LEAF-DEMO', badgeTitle: 'Photosynthesis Explorer',
      grades: 'Grades 6–7', duration: '45–50 minutes', introLabel: 'Meet photosynthesis', confidenceTopic: 'how plants use light in photosynthesis',
      heroLabel: 'Light becomes living energy', heroPath: ['Illuminate', 'Count', 'Explain'],
      welcome: 'Watch an aquatic plant produce gas bubbles in the light. Count bubbles over time and, if available, compare with a shaded plant to explore photosynthesis.',
      materials: 'Elodea (Anacharis) sprigs, clear cups, water, baking soda, bright lamps, tablet flashlights or sunlight, scissors, a timer, and a device. A shaded cup or dark box is optional.',
      introTitle: 'Follow sunlight into the food web.', introSummary: 'Plants use light energy, water, and carbon dioxide to make sugars, releasing oxygen. Gas bubbles give us a visible clue.',
      introFlow: [['Light', 'Energy from the sun or a lamp reaches the plant.'], ['Photosynthesis', 'The plant uses carbon dioxide and water to make sugars.'], ['Oxygen', 'Oxygen is released as a product of photosynthesis.']],
      concepts: [
        ['What is photosynthesis?', 'Photosynthesis transforms light energy into chemical energy stored in sugars. Plants take in carbon dioxide and water; they produce sugars and release oxygen.'],
        ['Why baking soda?', 'Baking soda supplies dissolved bicarbonate, which helps make carbon dioxide available to the aquatic plant. Keep the amount the same when comparing cups.'],
        ['What can bubbles tell us?', 'Bubbles from an illuminated aquatic plant are evidence of gas production. Counts are an estimate, not a perfect measure of photosynthesis: bubble size, temperature, and the plant itself can affect the result.']
      ],
      usesTitle: 'Why photosynthesis matters', uses: [
        ['Food webs', 'Energy for plants and the animals that eat them', 'Plants store energy in sugars used for growth. Animals obtain energy by eating plants or other animals, connecting them to energy originally captured from light.'],
        ['Oxygen and carbon', 'A connection across living systems', 'Photosynthesis removes carbon dioxide and releases oxygen. Plants also carry out cellular respiration, using sugars for energy during both day and night.'],
        ['Future energy research', 'Learning from plants', 'Researchers study algae, plant-based fuels, and artificial photosynthesis to explore ways of storing solar energy. These technologies each have benefits and limitations.']
      ],
      predictionQuestion: 'How do you predict bright light will affect bubble production compared with shade?',
      predictions: [choice('light-more', 'More bubbles in bright light', 'A higher count per minute'), choice('shade-more', 'More bubbles in shade', 'A higher count away from bright light'), choice('same', 'The same in both', 'Similar counts per minute'), choice('no-bubbles', 'No bubbles in either', 'No visible gas production')],
      correctPrediction: 'light-more', correctAnswer: 'oxygen', guideTitle: 'Make photosynthesis visible.',
      safety: 'Follow your presenter when cutting stems. Keep water away from electrical lamps and cables, and avoid hot lamp surfaces. Do not taste the solution or plant.',
      steps: [
        step('Prepare', 'Prepare an Elodea sprig.', 'With your presenter, trim the stem at an angle and place it in a clear cup of water with the cut end visible.', 'A visible cut end helps us watch gas bubbles leaving the stem.', 'Describe the plant and where the cut end sits.'),
        step('Supply', 'Add a pinch of baking soda.', 'Use the amount your presenter gives you. If you have a shaded comparison cup, use a similar sprig, the same water volume, and the same baking soda amount.', 'Baking soda helps supply dissolved carbon dioxide for photosynthesis. Similar cups make a fairer comparison.', 'What conditions are the same between cups?'),
        step('Illuminate', 'Place the cup in bright light.', 'Use sunlight or the presenter’s lamp setup. If available, place a second cup in shade or a dark box. Keep the light position steady.', 'Changing available light can change the rate of photosynthesis.', 'Record the light source and the comparison setup.'),
        step('Count', 'Count bubbles for 10–15 minutes.', 'Count bubbles from the same stem during each one-minute interval. Enter the light counts and any shaded comparison counts in the table. Observe for at least 10 minutes, or 15 if time allows.', 'Using equal time intervals lets us compare bubble production over time and between conditions.', 'Were any bubbles difficult to count?'),
        step('Compare', 'Use your counts to explain the pattern.', 'Compare counts in light and shade if you measured both. If you only had a light cup, describe its changes over time without claiming you tested shade.', 'A good conclusion distinguishes what we measured from what we predicted.', 'What pattern did you see? What could affect it?')
      ],
      observationQuestion: 'Did you observe bubbles from the plant in bright light?', observationHint: 'Use your bubble counts and elapsed time. Compare light and shade only if you tested both; explain any counting difficulties.',
      observationTags: [choice('light-bubbles', 'Bubbles in light'), choice('shade-bubbles', 'Bubbles in shade'), choice('faster-light', 'More bubbles in light'), choice('no-bubbles', 'No visible bubbles')],
      postCheckQuestion: 'Which gas do plants release during photosynthesis?',
      postCheckOptions: [choice('oxygen', 'Oxygen'), choice('co2', 'Carbon dioxide'), choice('helium', 'Helium'), choice('sugar', 'Sugar gas')],
      correctExplanation: 'Photosynthesis uses carbon dioxide and water to make sugars using light energy. Oxygen is released as a product.',
      successLabel: 'Bubbles in light', successDetail: 'groups reported gas bubbles in bright light', predictionMetric: 'predicted more bubbles in bright light', conceptMetric: 'identified oxygen from photosynthesis',
      reflections: [reflection('gas', 'What gas is being produced?'), reflection('bicarbonate', 'Why did we add baking soda to the solution?'), reflection('light', 'Why would a shaded plant usually produce fewer bubbles? If you tested shade, what did your results show?'), reflection('life', 'Why does photosynthesis matter for life beyond the plant itself?')],
      measurements: { title: 'Bubbles per minute', description: 'Count bubbles during each full one-minute interval for 10–15 minutes. Shade is optional. Enter 0 for a measured interval with no bubbles; leave any interval or condition you did not measure blank.', columns: ['Minute interval', 'Light (bubbles)', 'Shade (optional)'], rows: Array.from({ length: 15 }, (_, i) => ({ label: `${i}–${i + 1} min`, keys: [`light_${i + 1}`, `shade_${i + 1}`] })), fields: Array.from({ length: 15 }, (_, i) => [field(`light_${i + 1}`, `Light: minute ${i + 1} bubble count`, { step: 1 }), field(`shade_${i + 1}`, `Shade: minute ${i + 1} bubble count`, { step: 1 })]).flat() }
    },
    'bird-beak-lab': {
      slug: 'bird-beak-lab', title: 'Bird Beak Lab', demoCode: 'BEAK-DEMO', badgeTitle: 'Evolution Explorer',
      grades: 'Grades 6–7', duration: '45–50 minutes', introLabel: 'Meet natural selection', confidenceTopic: 'how environments affect natural selection',
      heroLabel: 'Different beaks, different advantages', heroPath: ['Model', 'Compare', 'Explain'],
      welcome: 'Use different tools as model bird beaks, collect food in timed rounds, and compare performance across feeding grounds. Explore how environments can favour different inherited traits.',
      materials: 'Spoons, forks, chopsticks, plastic knives, mini containers, marbles, large containers for feeding grounds, a timer, and a device.',
      introTitle: 'A useful beak depends on the environment.', introSummary: 'Model how differences in beak shape affect feeding, then connect your evidence to natural selection over generations.',
      introFlow: [['Variation', 'Birds in a population can have different inherited beak shapes.'], ['Environment', 'Food and feeding conditions affect which shapes work well.'], ['Generations', 'Traits can become more common when their carriers leave more offspring.']],
      concepts: [
        ['What is evolution?', 'Evolution is change in the inherited traits of a population across generations. An individual bird does not evolve a new beak because it needs one.'],
        ['Natural selection', 'When individuals with certain inherited traits survive and reproduce more successfully in an environment, those traits may become more common over generations.'],
        ['Our model has limits', 'Tools model beak shapes and collected marbles model access to food. We measure feeding performance today; real natural selection also involves inheritance, survival, reproduction, and many generations.']
      ],
      usesTitle: 'From model beaks to living populations', uses: [
        ['Darwin’s finches', 'Variation meets different food sources', 'Finches have a variety of beak sizes and shapes. Food availability can favour particular inherited beak traits, and the advantage can change when the environment changes.'],
        ['Patterns of selection', 'Different conditions favour different traits', 'Directional selection favours one end of a range; stabilizing selection favours intermediate traits; disruptive selection favours both extremes. Which pattern occurs depends on the environment.'],
        ['Why scientists study evolution', 'Understanding change in living things', 'Evolution helps explain biodiversity, relationships among organisms, and changes such as antibiotic resistance. Scientists use evidence gathered across generations.']
      ],
      predictionQuestion: 'What do you predict about which model beak will collect the most food?',
      predictions: [choice('beak-environment', 'It depends on the environment', 'Different beaks may work better in different feeding grounds'), choice('same-beak', 'One beak always wins', 'The same tool will be best in every environment'), choice('equal-counts', 'Every beak collects equally', 'All tool shapes perform the same'), choice('random-only', 'Only luck matters', 'Tool shape and environment make no difference')],
      correctPrediction: 'beak-environment', correctAnswer: 'inherited-variation', guideTitle: 'Test a beak. Change the feeding ground.',
      safety: 'Use the tools only as your presenter demonstrates. Keep marbles away from mouths and pick up any that fall. Collect carefully without pushing, grabbing, or swinging tools.',
      steps: [
        step('Set up', 'Prepare the feeding grounds.', 'Use the presenter’s large containers and marbles to create two labelled feeding environments. Describe how the environments differ.', 'Different feeding conditions can change which beak shape is useful.', 'What is different between environment A and B?'),
        step('Choose', 'Choose your model beaks.', 'Use spoons, forks, chopsticks, or plastic knives as the presenter assigns. Agree on one timed round length and the same collection rules for every trial.', 'To compare fairly, keep time, starting food, and rules consistent while changing the beak or environment.', 'Which beak tools and round length will you use?'),
        step('Collect', 'Run timed feeding rounds.', 'Start on the presenter’s signal. Use only the model beak to move marbles into your mini container. Stop at the signal and count the marbles collected.', 'The count models how much food a bird could gather under those conditions.', 'Was any food dropped? Was handling difficult?'),
        step('Repeat', 'Compare another beak and environment.', 'Repeat the timed trials to compare at least two beak tools in each of the two environments. Reset the starting food and record each beak, environment, duration, and count.', 'Repeating across environments can show whether a useful trait depends on conditions. More trials can help separate patterns from chance.', 'Did the best-performing beak change?'),
        step('Explain', 'Connect feeding performance to selection.', 'Compare your counts. Discuss how inherited beak traits that improve access to food might affect survival and reproduction over many generations.', 'Natural selection changes populations over generations. Our one-session model demonstrates feeding differences, not evolution happening instantly.', 'What does this model show, and what does it leave out?')
      ],
      observationQuestion: 'Did feeding counts differ between beak tools or environments?', observationHint: 'Compare counts from equal-duration rounds. Name the beak and environment, and describe any repeat trials or problems with the model.',
      observationTags: [choice('counts-differ', 'Beaks collected different amounts'), choice('environment-difference', 'Performance changed with environment'), choice('same-counts', 'Similar counts'), choice('handling-difficulty', 'Tool was difficult to use')],
      postCheckQuestion: 'How can natural selection change a bird population over many generations?',
      postCheckOptions: [choice('inherited-variation', 'Inherited traits that help birds survive and reproduce can become more common'), choice('instant-change', 'Each bird changes its beak immediately when it needs to'), choice('choice', 'Birds choose the traits their offspring inherit'), choice('same-everywhere', 'The same trait is always best in every environment')],
      correctExplanation: 'Natural selection acts on inherited variation. Traits that help survival and reproduction in a particular environment can become more common across generations.',
      successLabel: 'Different feeding counts', successDetail: 'groups reported differences by beak or environment', predictionMetric: 'predicted that beak performance depends on environment', conceptMetric: 'connected selection to inherited variation',
      reflections: [reflection('selection', 'What is natural selection?'), reflection('traits', 'How can natural selection influence which inherited traits become common?'), reflection('environment', 'Why do different environments affect natural selection? Use evidence from your model.'), reflection('research', 'Why do scientists study evolution?')],
      measurements: { title: 'Timed feeding rounds', description: 'Record the beak tool, environment, round length in seconds, and marbles collected. Compare at least two tools in each environment. Keep the duration and starting food the same for a fair comparison.', columns: ['Round', 'Beak tool', 'Environment', 'Seconds', 'Marbles'], rows: Array.from({ length: 8 }, (_, i) => ({ label: `${i + 1}`, keys: [`round_${i + 1}_beak`, `round_${i + 1}_environment`, `round_${i + 1}_seconds`, `round_${i + 1}_count`] })), fields: Array.from({ length: 8 }, (_, i) => [field(`round_${i + 1}_beak`, `Round ${i + 1}: beak tool`, { type: 'select', options: ['Spoon', 'Fork', 'Chopsticks', 'Plastic knife'] }), field(`round_${i + 1}_environment`, `Round ${i + 1}: environment`, { type: 'text', maxlength: 80 }), field(`round_${i + 1}_seconds`, `Round ${i + 1}: duration in seconds`, { max: 3600, step: 1 }), field(`round_${i + 1}_count`, `Round ${i + 1}: marbles collected`, { step: 1 })]).flat() }
    }
  };
  Object.values(workshops).forEach((workshop) => {
    workshop.sourceUrl = 'https://docs.google.com/document/d/1Xjb3_ISZh8sjFmNIQ8zUPuZOZ-9kIf13BCRz58v1Pfw/edit';
    workshop.sourceReviewedAt = '2026-09-17';
    workshop.postCheckCorrectAnswer = workshop.correctAnswer;
    workshop.stepCount = workshop.steps.length;
  });
  window.SCOPE_WORKSHOPS = workshops;
  const requested = new URLSearchParams(window.location.search).get('lab');
  window.SCOPE_WORKSHOP = workshops[requested] || workshops['dna-discovery-lab'];
}());
