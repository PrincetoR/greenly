/**
 * เนื้อหาบทความเป็นข้อความล้วน (หลังบ้านพิมพ์ใน textarea) — แปลงเป็นบล็อกทีละบรรทัด:
 *   "## " = หัวข้อย่อย · "- " = รายการ · บรรทัดอื่น = ย่อหน้า (บรรทัดว่างคั่นย่อหน้า)
 * อ่านทีละบรรทัดแทนทีละย่อหน้า เพราะคนเขียนมักพิมพ์หัวข้อกับรายการติดกันโดยไม่เว้นบรรทัด
 * ไม่รับ HTML จากผู้ใช้ จึงไม่ต้องกังวลเรื่อง XSS
 */
type Block = { type: 'h2' | 'p' | 'ul'; lines: string[] };

export function parseArticleBody(body: string): Block[] {
  const blocks: Block[] = [];
  // open = บล็อกล่าสุดยังรับบรรทัดต่อได้ (ยังไม่เจอบรรทัดว่างหรือหัวข้อคั่น)
  let open = false;

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) {
      open = false;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', lines: [line.slice(3).trim()] });
      open = false;
      continue;
    }
    const type = line.startsWith('- ') ? 'ul' : 'p';
    const text = type === 'ul' ? line.slice(2).trim() : line;
    const last = blocks[blocks.length - 1];
    if (open && last?.type === type) last.lines.push(text);
    else {
      blocks.push({ type, lines: [text] });
      open = true;
    }
  }
  return blocks;
}

/** .selectable = คลุมดำคัดลอกได้ (ทั้งเว็บปิดไว้ — พี่ต่อสั่ง) เพราะบทความคือเนื้อหาที่คนอยากคัดไปอ้างอิง */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="selectable flex flex-col gap-4">
      {parseArticleBody(body).map((block, i) => {
        if (block.type === 'h2') {
          return (
            <h2 key={i} className="mt-2 text-xl leading-8 font-bold">
              {block.lines[0]}
            </h2>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-[15px] leading-8">
              {block.lines.map((l, j) => (
                <li key={j}>{l}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[15px] leading-8">
            {block.lines.join(' ')}
          </p>
        );
      })}
    </div>
  );
}
