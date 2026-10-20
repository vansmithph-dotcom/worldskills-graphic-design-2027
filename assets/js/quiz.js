export function gradeAnswer(selected, correct) {
  if (selected === undefined || selected === null || selected === '') return { state: 'unanswered' };
  return { state: selected === correct ? 'correct' : 'incorrect' };
}

export function renderQuiz(lesson, lessonIndex) {
  const details=document.createElement('details');details.className='quiz-block';
  const summary=document.createElement('summary');summary.textContent=`Проверь себя · ${lesson.quiz.length} вопроса`;details.append(summary);
  lesson.quiz.forEach((item,questionIndex)=>{
    const form=document.createElement('form');form.className='quiz-question';
    const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=item.question;fieldset.append(legend);
    item.options.forEach((option,optionIndex)=>{const label=document.createElement('label');label.className='quiz-option';const input=document.createElement('input');input.type='radio';input.name=`quiz-${lessonIndex}-${questionIndex}`;input.value=option.id;input.id=`${input.name}-${optionIndex}`;label.htmlFor=input.id;label.append(input,document.createTextNode(option.text));fieldset.append(label);});
    const button=document.createElement('button');button.className='button button-dark quiz-check';button.type='submit';button.textContent='Проверить ответ';
    const feedback=document.createElement('p');feedback.className='quiz-feedback';feedback.setAttribute('aria-live','polite');feedback.setAttribute('role','status');form.append(fieldset,button,feedback);
    form.addEventListener('submit',event=>{event.preventDefault();const selected=form.querySelector('input:checked')?.value??'';const result=gradeAnswer(selected,item.answer);if(result.state==='unanswered'){feedback.textContent='Сначала выбери один вариант, потом проверь себя.';return;}const correct=item.options.find(option=>option.id===item.answer);feedback.textContent=result.state==='correct'?`Верно. ${item.explanation}`:`Пока нет. ${item.common_error} Верный ответ: «${correct?.text??item.answer}». ${item.explanation}`;});details.append(form);
  });return details;
}
