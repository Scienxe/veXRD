import os
import shutil
import xml.etree.ElementTree as ET

files = os.listdir( os.getcwd() )

for file in files:
    fileName, fileExt = os.path.splitext( file )
    if fileExt == '.xml':
        tree = ET.parse( file )
        root = tree.getroot()
        pdf_data = root.find( 'pdf_data' )
        newname = pdf_data.find( 'chemical_formula' ).text + ' - ' + pdf_data.find( 'pdf_number' ).text + '.xml'
        shutil.move( file, newname )