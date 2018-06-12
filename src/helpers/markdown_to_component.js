import unified from 'unified';
import reactRenderer from 'remark-react';
import HeadingRenderer from '../components/renderers/heading_renderer';
import PreRenderer from '../components/renderers/pre_renderer';
import TableRenderer from '../components/renderers/table_renderer';

const processor = unified().use(reactRenderer, {
  sanitize: false,
  remarkReactComponents: {
    h1: HeadingRenderer(1),
    h2: HeadingRenderer(2),
    h3: HeadingRenderer(3),
    h4: HeadingRenderer(4),
    h5: HeadingRenderer(5),
    h6: HeadingRenderer(6),
    pre: PreRenderer,
    table: TableRenderer
  }
});

const sectionTitleToRoute = (title, componentPath) => {
  const sectionPath = title.toLowerCase().replace(/[ ]+/g, '_').replace(/[^a-z0-9_.]/g, '');
  if (sectionPath === 'overview') return componentPath;
  return `${componentPath}/${sectionPath}`;
};

const markdownFileToComponent = ({fileName, json}) => {
  const file = fileName.replace(/^\.\//, '');
  const componentPath = '/' + fileName.toLowerCase().replace(/\.md$/, '').split('/').pop();

  let pageMetadata;
  const pageSections = [];

  json.children.forEach(child => {
    if (!pageMetadata && child.type === 'yaml') {
      pageMetadata = child.data.parsedValue;
      return;
    }

    if (child.type === 'heading' && child.depth === 1) {
      pageSections.push({title: child.children[0].value, rawContent: []});
      return;
    }

    // TODO
    if (!pageSections.length) pageSections.push({title: 'Overview?', rawContent: []});
    pageSections[pageSections.length - 1].rawContent.push(child);
  });

  if (pageMetadata.reactPath) pageSections.push({title: 'Props'});

  pageSections.forEach(section => {
    const {rawContent, route, title} = section;
    const toProcess = {type: 'root', children: rawContent};
    section.route = route || sectionTitleToRoute(title, componentPath);
    section.SectionComponent = () => processor.stringify(processor.runSync(toProcess));
  });

  const pageComponents = {};
  if (pageMetadata && pageMetadata.reactPath) {
    const componentPath = pageMetadata.reactPath.split('/').pop();
    const exported = require(`pivotal-ui/react/${componentPath}`);
    Object.entries(exported).forEach(([key, value]) => {
      window[key] = pageComponents[key] = value;
    });
  }

  return {
    file,
    route: componentPath,
    pageMetadata,
    pageSections,
    pageComponents
  };
};

export default markdownFileToComponent;