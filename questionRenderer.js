export function escapeText(text) { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function renderQuestionText(text) { text = text.replace(/^(\d+)\/(\d+)(L|m|kg)?$/, '[FRACTION:$1/$2]$3'); text = text.replace(/(?<![\w:/])(\d+)\s*(?:와|과)\s*(\d+)\/(\d+)/g, '[FRACTION:$1 $2/$3]'); const regex = /\[FRACTION:(?:(\d+) )?(\d+)\/(\d+)\]/g; let output = '', cursor = 0; for (const match of text.matchAll(regex)) {
    output += escapeText(text.slice(cursor, match.index)).replace(/\n/g, '<br>');
    output += '<span class="fraction" aria-label="' + (match[1] ? match[1] + '과 ' : '') + match[3] + '분의 ' + match[2] + '">' + (match[1] ? '<span class="fraction-whole">' + match[1] + '</span>' : '') + '<span class="fraction-stack"><span>' + match[2] + '</span><span>' + match[3] + '</span></span></span>';
    cursor = match.index + match[0].length;
} return output + escapeText(text.slice(cursor)).replace(/\n/g, '<br>'); }
