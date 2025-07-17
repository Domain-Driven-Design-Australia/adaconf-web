const htmlmin = require("html-minifier");
const markdownIt = require('markdown-it');
const pluginRss = require("@11ty/eleventy-plugin-rss");
const fetch = require("@11ty/eleventy-fetch");
const fs = require("fs/promises");
const path = require("path");

const isPages = process.env.ELEVENTY_ENV === 'pages'
const outDir = isPages ? 'docs' : 'public'

module.exports = function (eleventyConfig) {
  // PLUGINS
  eleventyConfig.addPlugin(pluginRss);

  // shortcode to render markdown from string => {{ STRING | markdown | safe }}
  eleventyConfig.addFilter('markdown', function (value) {
    let markdown = require('markdown-it')({
      html: true
    });
    return markdown.render(value);
  });

  // rebuild on CSS changes
  eleventyConfig.addWatchTarget('./src/_includes/css/');

  // Markdown
  eleventyConfig.setLibrary(
    'md',
    markdownIt({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true
    })
  )

  //create collections
  eleventyConfig.addCollection('sections', async (collection) => {
    return collection.getFilteredByGlob('./src/sections/*.md');
  });

  // Speaker List
  const filters = eleventyConfig.nunjucksFilters;
  const sessionizeImageUrl = '/img/speakers/sessionize';
  const sessionizeImagePath = path.join(outDir, sessionizeImageUrl);
  fs.mkdir(sessionizeImagePath, { recursive: true });
  eleventyConfig.ignores.delete(sessionizeImagePath);
  eleventyConfig.watchIgnores.add(sessionizeImagePath);
  eleventyConfig.addCollection('sessionizeSpeakers', async () => {
    const speakers = await fetch('https://sessionize.com/api/v2/656ttfhs/view/Speakers', {
      duration: "1d",
      type: "json",
    });
    for (const speaker of speakers) {
      if (speaker.profilePicture) {
        const image = await fetch(speaker.profilePicture, {
          duration: "1d",
          type: "buffer"
        });
        const imageFileName = `${filters.slugify(speaker.fullName)}.png`;

        const relativeImagePath = path.join(sessionizeImagePath, imageFileName);
        await fs.writeFile(relativeImagePath, image);

        speaker.relativeProfilePicture = path.join(sessionizeImageUrl, imageFileName);
        console.log(`Writing ${imageFileName} to ${relativeImagePath} so it can be served from ${speaker.relativeProfilePicture}`);
      }
    }
    return speakers;
  });

  // Workshops
  eleventyConfig.addCollection('sessionizeWorkshops', async () => {
    let workshops = await fetch('https://sessionize.com/api/v2/3qfvo45q/view/Sessions', {
      duration: "1d",
      type: "json",
    });
    for (const workshopGroup of workshops) {
      if (workshopGroup.groupName.match(/1 day/)) {
        workshopGroup.groupName = "One Day Workshops";
      } else {
        workshopGroup.groupName = "Two Day Workshops";
      }
    }
    return workshops;
  });

  // Agenda
  eleventyConfig.addCollection('sessionizeAgenda', async () => {
    return await fetch('https://sessionize.com/api/v2/z14jafzm/view/GridSmart', {
      duration: "1d",
      type: "string",
    });
  });

  eleventyConfig.addFilter("speaker", (speakers, speakerId) =>
    speakers.find(sp => sp.id == speakerId)
  );

  // STATIC FILES
  eleventyConfig.addPassthroughCopy({ './src/static/': '/' });

  // TRANSFORM -- Minify HTML Output
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });

  return {
    dir: {
      input: 'src',
      output: outDir,
      data: './_data',
      includes: './_includes',
      layouts: './_layouts'
    },
    templateFormats: [
      'md',
      'njk',
      '11ty.js'
    ],
    htmlTemplateEngine: 'njk'
  };
};