let input = document.querySelector("input");
let fileURL;

input.onchange = e => {
	
	if (fileURL !== null)
		URL.revokeObjectURL(fileURL);
	
	fileURL = window.URL.createObjectURL(e.target.files[0]);
	let versionSelect = document.querySelector('[class="version-select"]');
	
	if (versionSelect.getAttribute("style") == "display: none;")
		versionSelect.setAttribute("style", "");
}

function rebuild() {
	let rightVersion = document.getElementById("dates").value;
	
	if (rightVersion !== "default") {
		destroyPoems();
		buildPage(rightVersion, fileURL);
	}
}

function destroyPoems() {
	let span = document.querySelectorAll('[class="poem-container"]');
	
	for (let i = span.length - 1; i > -1; i--)
		span[i].remove();
}

function buildPage(rightVersion, fileURL) {
	let c = new CETEI();
	c.getHTML5(fileURL, function(data) {
		let poemNums = [];
		
		for (let i = 0; i < 71; i++)
			poemNums.push(i + 1);
		
		let poems1 = [];
		
		for (let i = 0; i < poemNums.length; i++)
			poems1.push(data.querySelectorAll('[type="poem"]').item(poemNums[i] - 1));
		
		let footnotes = [];
		
		for (let i = 0; i < poems1.length; i++) {
			let origText = getOrigText(poems1[i], rightVersion - 1600);
			let altText = getAltText(poems1[i], rightVersion - 1600);
			footnotes.push(formatFootnote(origText, altText, rightVersion - 1600));
		}
		
		trimPoems(rightVersion - 1600, data);
		let text = extractText(data, rightVersion - 1600);
		let x = 0;
		
		for (const [key, value] of Object.entries(text)) {
			let container = document.createElement("div");
			container.setAttribute("class", "poem-container");
			
			let poem = document.createElement("div");
			poem.setAttribute("class", "poem");
			let title = document.createElement("h2");
			title.innerHTML = value[0];
			let body = document.createElement("div");
			
			poem.appendChild(title);
			poem.appendChild(body);

			for (let i = 1; i < value.length; i++) {
				let line = document.createElement("span");
				line.innerHTML = value[i];
				body.appendChild(line);
			}
			
			container.appendChild(poem);
			
			// Logic for footnotes here.
			let lineBreak = document.createElement("br");
			container.appendChild(lineBreak);
			
			let notes = document.createElement("div");
			notes.setAttribute("class", "footnotes");
			
			for (let i = 0; i < footnotes[x].length; i++) {
				let note = document.createElement("span");
				note.innerHTML = "[" + (i + 1) + "] " + footnotes[x][i];
				notes.appendChild(note);
			}
			
			container.appendChild(notes);
			document.body.appendChild(container);
			x += 1;
		}
	});
}

function getFileName(filePath) {
	let startIndex = (filePath.indexOf("\\") >= 0 ? filePath.lastIndexOf("\\") : filePath.lastIndexOf("/"));
	let fileName = filePath.substring(startIndex);
		
	if (fileName.indexOf("\\") === 0 || fileName.indexOf("/") === 0)
		fileName = fileName.substring(1);
		
	return fileName;
}

function getOrigText(poem, version) {
	let result = [];
	let lines = poem.querySelectorAll("tei-app");
	
	for (let i = 0; i < lines.length; i++) {
		
		if (version === 64 || version === 68) {
			let rdgGrps = lines[i].getElementsByTagName("tei-rdggrp");
			
			if (rdgGrps.length === 0) {
				let string = "";
				let flag = true;
				
				if (version === 64 && lines[i].querySelector("[wit='#PF64']") !== null) {
					string = shear(lines[i].querySelector("[wit='#PF64']").querySelector("tei-reg").textContent);
					flag = false;
				}
				else if (version === 68) {
					string = shear(lines[i].querySelector("[wit='#PF68']").querySelector("tei-reg").textContent);
					flag = false;
				}
				
				if (!flag)
					result.push(string);
			}
			
			else {
				for (let j = 0; j < rdgGrps.length; j++) {
					let string = "";
					
					if (version === 64)
						string = shear(rdgGrps[j].querySelector("[wit='#PF64']").querySelector("tei-reg").textContent);
					else if (version === 68)
						string = shear(rdgGrps[j].querySelector("[wit='#PF68']").querySelector("tei-reg").textContent);
					
					result.push(string);
				}
			}
		}
		
		else if (version === 53) {
			let lemmas = lines[i].getElementsByTagName("tei-lem");
			
			for (let j = 0; j < lemmas.length; j++) {
				let string = shear(lemmas[j].querySelector("tei-choice").querySelector("tei-reg").textContent);
				result.push(string);
			}
		}
	}
	
	return result;
}

function shear(string) {
	return string.replace(/\s\s+/g, " ").trim();
}

function getAltText(poem, rightVersion) {
	let result = [];
	let apps = poem.getElementsByTagName("tei-app");
	
	for (let i = 0; i < apps.length; i++) {
		let rdgs = apps[i].querySelectorAll("tei-rdg");
		
		if (rightVersion === 53)
			result = addTextFor1953(result, rdgs);
		
		else {
			let lemma = apps[i].querySelector("tei-lem");
			let flag = (apps[i].querySelector("tei-rdgGrp") === null);
			
			if (rightVersion === 64 && apps[i].querySelector("[wit='#PF64']") !== null)
				result = addTextFor1960s(result, lemma, flag, apps[i].querySelector("[wit='#PF68']"), 68);
		
			else if (rightVersion === 68 && apps[i].querySelector("[wit='#PF68']") !== null)
				result = addTextFor1960s(result, lemma, flag, apps[i].querySelector("[wit='#PF64']"), 64);
		}
	}
	
	for (let i = 0; i < result.length; i++) {
		if (result[i].textContent !== undefined) {
			
			if (result[i].getElementsByTagName("tei-hi").length > 0) {
				let italicized = result[i].querySelector("tei-hi").textContent;
				result[i] = result[i].textContent.replace(italicized, "<i>" + italicized + "</i>").replace(/\s\s+/g, " ").trim();
			}
			
			else
				result[i] = result[i].textContent.replace(/\s\s+/g, " ").trim();
		}
	}
	
	return result;
}

function addTextFor1953(array, rdgs, lemma) {
	
	for (let i = 0; i < rdgs.length; i++) {
		let rdg = rdgs[i];
		let start = (i % 2 === 0);
		
		for (let j = 0; j < 3; j++) {
			if (j === 0) {
				
				if (start) {
					array.push("]");
					start = false;
				}
				else
					array.push(";");
			}
			
			else if (j === 1)
				array.push(rdg.querySelector("tei-orig"));
			
			else if (j === 2)
				array.push("16" + rdg.getAttribute("wit").slice(3, 5));
		}
	}
	
	return array;
}

function addTextFor1960s(array, lemma, flag, rdg, year) {
	array.push("]");
	array.push(lemma.querySelector("tei-orig"));
	array.push("1653");
	
	if (!flag)
		return array;
	
	if (rdg === null)
		return array;
	
	for (let i = 0; i < 3; i++) {
		if (i === 0) 
			array.push(";");
		
		else if (i === 1)
			array.push(rdg.querySelector("tei-orig"));
		
		else if (i === 2)
			array.push("16" + year);
	}
	
	return array;
}

function extractText(data, rightVersion) {
	let result = {};
	let poems = data.querySelectorAll("tei-div[type='poem']");
	
	for (let i = 0; i < poems.length; i++) {
		let header;
		let count = 1;
		
		for (let j = 0; j < poems[i].children.length; j++) {
			let words = poems[i].children[j];
			
			if (words.getAttribute("data-origname") === "head") {
				header = shear(words.textContent);
				result[header] = [];
				
				if (words.getElementsByTagName("tei-app").length > 0) {
					for (let x = 0; x < words.getElementsByTagName("tei-app").length; x++) {
						let app = words.getElementsByTagName("tei-app").item(x);
						app.textContent = "<span class='scriptable'>" + shear(app.textContent) + "[" + count + "]" + "</span>";
					}
					
					count += 1;
				}
				
				result[header].push(shear(words.textContent));
			}
			
			else {
				for (let k = 0; k < poems[i].children[j].children.length; k++) {
					let target = poems[i].children[j].children[k];
					
					if (target.getElementsByTagName("tei-app").length > 0) {
						for (let x = 0; x < target.getElementsByTagName("tei-app").length; x++) {
							let app = target.getElementsByTagName("tei-app").item(x);
							
							if (rightVersion === 64 && app.querySelector("[wit='#PF64']") === null)
								break;
							
							if (rightVersion === 68 && app.querySelector("[wit='#PF68']") === null)
								break;
							
							app.textContent = "<span class='scriptable'>" + shear(app.textContent) + "[" + count + "]" + "</span>";
							count += 1;
						}
					}
					
					let string = shear(target.textContent);
					result[header].push(string);
				}
			}
		}
	}
	
	return result;
}

function trimPoems(rightVersion, data) {
	trimWrongVersions(rightVersion, data);
	trimOriginalText(data);
	
	let end = data.getElementsByTagName("tei-listwit");
	
	for (let i = end.length - 1; i > -1; i--)
		end[i].remove();
}

function trimWrongVersions(rightVersion, data) {
	let version = formatVersion(rightVersion);
	trimRdgs(version, data);
	
	if (version === "#PF64" || version === "#PF68")
		trimLemmas(data);
}

function formatVersion(versionNumber) {
	return "#PF" + versionNumber;
}

function trimRdgs(rightVersion, data) {
	let rdgs = data.getElementsByTagName("tei-rdg");
	let wrongVersions = [];
	
	for (let i = 0; i < rdgs.length; i++)
		if (rdgs[i].getAttribute("wit") !== rightVersion)
			wrongVersions.push(rdgs.item(i));
	
	for (let i = wrongVersions.length - 1; i > -1; i--)
		wrongVersions[i].remove();
}

function trimLemmas(data) {	
	let lemmas = data.getElementsByTagName("tei-lem");
	
	for (let i = lemmas.length - 1; i > -1; i--)
		lemmas[i].remove();
}

function trimOriginalText(data) {
	let origs = data.getElementsByTagName("tei-orig");
	
	while (origs.length > 0)
		origs[0].remove();
}

function formatFootnote(origText, altText, rightVersion) {
	let result = origText;
	let i = 0;
	
	for (let j = 0; j < altText.length; j++) {
		result[i] += " " + altText[j];
		
		if (rightVersion === 53 && j !== 0 && ((result[i].endsWith("1664") && j + 1 < altText.length && altText[j + 1] !== ";") || result[i].endsWith("1668"))) {
			result[i] = result[i].replaceAll(" ]", "]");
			result[i] = result[i].replaceAll(" ;", ";");
			i += 1;
		}
		
		else if (rightVersion === 64 && j !== 0 && ((result[i].endsWith("1653") && j + 1 < altText.length && altText[j + 1] !== ";") || result[i].endsWith("1668"))) {
			result[i] = result[i].replaceAll(" ]", "]");
			result[i] = result[i].replaceAll(" ;", ";");
			i += 1;
		}
		
		else if (rightVersion === 68 && j !== 0 && ((result[i].endsWith("1653") && j + 1 < altText.length && altText[j + 1] !== ";") || result[i].endsWith("1664"))) {
			result[i] = result[i].replaceAll(" ]", "]");
			result[i] = result[i].replaceAll(" ;", ";");
			i += 1;
		}
		
		else if (j === altText.length - 1) {
			result[i] = result[i].replaceAll(" ]", "]");
			result[i] = result[i].replaceAll(" ;", ";");
			i += 1;
		}
	}
	
	for (let k = 0; k < result.length; k++)
		if (result[k].slice(result[k].length - 2, result[k].length) === " ]")
			result[k] = result[k].slice(0, result[k].length - 2);
	
	for (let k = 0; k < result.length; k++) {	
		let match1 = result[k].substring(result[k].indexOf("] ") + 2, result[k].indexOf(" 1664; "));
		let match2 = result[k].substring(result[k].indexOf("64; ") + 4, result[k].indexOf("1668") - 1);
		
		if (match1 === match2) {
			let toReplace = result[k].substring(result[k].indexOf("] ") + 2, result[k].indexOf("1668") + 5);
			result[k] = result[k].replace(toReplace, match1 + " 1664, 1668");
		}
	}
	
	return result;
}