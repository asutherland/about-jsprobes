FILES := bootstrap.js install.rdf stylesheet.css about-jsprobes.html about-jsprobes.js lib/*.js 

about-jsprobes.xpi: $(FILES)
	zip -9 $@ $+

clean:
	rm -f about-jsprobes.xpi *[~#]
